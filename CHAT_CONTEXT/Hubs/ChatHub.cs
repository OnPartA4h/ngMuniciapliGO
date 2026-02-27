using API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Models.DTOs;
using System.Security.Claims;

namespace API.Hubs;

/// <summary>
/// Hub SignalR pour le chat en temps réel.
/// Responsabilité : présence, indicateurs de frappe, et diffusion des événements aux membres.
/// La logique métier (persistance) est toujours effectuée via le REST API.
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private readonly IPresenceTracker _presenceTracker;
    private readonly IActiveCallTracker _activeCallTracker;
    private readonly ILogger<ChatHub> _logger;

    // Groupe SignalR pour un chat précis
    private static string ChatGroup(Guid chatId) => $"chat_{chatId}";

    // Groupe SignalR personnel de l'utilisateur
    private static string UserGroup(string userId) => $"user_{userId}";

    public ChatHub(
        IChatService chatService,
        IPresenceTracker presenceTracker,
        IActiveCallTracker activeCallTracker,
        ILogger<ChatHub> logger)
    {
        _chatService = chatService;
        _presenceTracker = presenceTracker;
        _activeCallTracker = activeCallTracker;
        _logger = logger;
    }

    // ── Connexion / Déconnexion ───────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId == null)
        {
            _logger.LogWarning("ChatHub: connexion sans userId valide.");
            await base.OnConnectedAsync();
            return;
        }

        try
        {
            // 1. Rejoindre le groupe personnel pour les notifications ciblées
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId));

            // 2. Vérifier si c'est la première connexion (avant d'enregistrer)
            var isFirstConnection = !_presenceTracker.IsOnline(userId);

            // 3. Enregistrer la connexion
            await _presenceTracker.UserConnectedAsync(userId, Context.ConnectionId);

            // 4. Récupérer les chatIds avec une requête légère (pas de N+1 comme GetMyChatsAsync)
            var chatIds = await _chatService.GetChatIdsForUserAsync(userId);

            // 5. Rejoindre TOUS les groupes SignalR d'abord — avant d'émettre quoi que ce soit
            foreach (var chatId in chatIds)
                await Groups.AddToGroupAsync(Context.ConnectionId, ChatGroup(chatId));

            // 6. Notifier les autres uniquement à la 1ère connexion (pas de doublons multi-appareils)
            if (isFirstConnection)
            {
                foreach (var chatId in chatIds)
                {
                    await Clients.OthersInGroup(ChatGroup(chatId))
                        .SendAsync("UserOnline", new { UserId = userId, ChatId = chatId });
                }
            }

            // 7. Envoyer au connectant un snapshot de présence PAR CHAT
            //    (plus précis que OnlineUsers global — le client sait exactement qui est en ligne dans chaque chat)
            foreach (var chatId in chatIds)
            {
                var memberIds = await _chatService.GetChatMemberIdsAsync(chatId, excludeUserId: userId);
                var onlineMemberIds = memberIds.Where(id => _presenceTracker.IsOnline(id)).ToList();
                if (onlineMemberIds.Any())
                {
                    await Clients.Caller.SendAsync("ChatOnlineUsers",
                        new { ChatId = chatId, UserIds = onlineMemberIds });
                }
            }

            _logger.LogInformation(
                "ChatHub: {UserId} connecté ({ConnectionId}, firstConnection={IsFirst}, chats={ChatCount})",
                userId, Context.ConnectionId, isFirstConnection, chatIds.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ChatHub: erreur lors de la connexion de {UserId} ({ConnectionId})",
                userId, Context.ConnectionId);
            await _presenceTracker.UserDisconnectedAsync(userId, Context.ConnectionId);
            throw;
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId != null)
        {
            var isFullyOffline = await _presenceTracker.UserDisconnectedAsync(userId, Context.ConnectionId);

            if (isFullyOffline)
            {
                try
                {
                    // Requête légère — pas de N+1
                    var chatIds = await _chatService.GetChatIdsForUserAsync(userId);
                    foreach (var chatId in chatIds)
                    {
                        await Clients.OthersInGroup(ChatGroup(chatId))
                            .SendAsync("UserOffline", new { UserId = userId, ChatId = chatId });

                        // Nettoyer toute room d'appel active pour cet utilisateur dans ce chat.
                        // Si l'utilisateur ferme l'app sans raccrocher (/hangup), la room resterait
                        // bloquée en mémoire et empêcherait tout nouvel appel dans ce chat.
                        var roomName = $"municipaligo_chat_{chatId}";
                        if (_activeCallTracker.IsCallActive(roomName))
                        {
                            var isLastParticipant = _activeCallTracker.ParticipantLeft(roomName, userId);
                            if (isLastParticipant)
                            {
                                _activeCallTracker.EndCall(roomName);
                                await Clients.OthersInGroup(ChatGroup(chatId))
                                    .SendAsync("CallEnded", new { ChatId = chatId, UserId = userId });
                                _logger.LogInformation(
                                    "ChatHub: room d'appel {Room} nettoyée à la déconnexion de {UserId}",
                                    roomName, userId);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "ChatHub: impossible de diffuser UserOffline/CallEnded pour {UserId}.",
                        userId);
                }
            }

            _logger.LogInformation("ChatHub: {UserId} déconnecté (fullyOffline={IsOffline})", userId, isFullyOffline);
        }

        if (exception != null)
            _logger.LogError(exception, "ChatHub: déconnexion avec erreur");

        await base.OnDisconnectedAsync(exception);
    }

    // ── Méthodes appelables par les clients ──────────────────────────────────

    /// <summary>
    /// Le client s'abonne explicitement à un chat (utile si l'utilisateur a rejoint après la connexion).
    /// Envoie également un snapshot de présence des membres de ce chat.
    /// </summary>
    public async Task JoinChat(Guid chatId)
    {
        var userId = GetUserId();
        if (userId == null) return;

        if (!await _chatService.IsMemberAsync(chatId, userId))
        {
            _logger.LogWarning("ChatHub: {UserId} a tenté de rejoindre le chat {ChatId} sans en être membre.", userId, chatId);
            throw new HubException("Vous n'êtes pas membre de ce chat.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, ChatGroup(chatId));

        // Envoyer un snapshot de présence pour ce chat au client qui rejoint
        var memberIds = await _chatService.GetChatMemberIdsAsync(chatId, excludeUserId: userId);
        var onlineMemberIds = memberIds.Where(id => _presenceTracker.IsOnline(id)).ToList();
        if (onlineMemberIds.Any())
        {
            await Clients.Caller.SendAsync("ChatOnlineUsers", new { ChatId = chatId, UserIds = onlineMemberIds });
        }

        _logger.LogInformation("ChatHub: {UserId} a rejoint le groupe SignalR du chat {ChatId} (onlineMembers={Count})",
            userId, chatId, onlineMemberIds.Count);
    }

    /// <summary>
    /// Le client se désabonne d'un chat (après avoir quitté le groupe via l'API REST).
    /// </summary>
    public async Task LeaveChat(Guid chatId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ChatGroup(chatId));
    }

    /// <summary>
    /// Diffuse un indicateur de frappe à tous les autres membres du chat.
    /// </summary>
    public async Task TypingStart(Guid chatId)
    {
        var userId = GetUserId();
        if (userId == null) return;

        if (!await _chatService.IsMemberAsync(chatId, userId)) return;

        await Clients.OthersInGroup(ChatGroup(chatId))
            .SendAsync("TypingStart", new { ChatId = chatId, UserId = userId });
    }

    /// <summary>
    /// Diffuse la fin de la frappe à tous les autres membres du chat.
    /// </summary>
    public async Task TypingStop(Guid chatId)
    {
        var userId = GetUserId();
        if (userId == null) return;

        if (!await _chatService.IsMemberAsync(chatId, userId)) return;

        await Clients.OthersInGroup(ChatGroup(chatId))
            .SendAsync("TypingStop", new { ChatId = chatId, UserId = userId });
    }

    // ── Méthodes appelées par le serveur (depuis les contrôleurs) ─────────────

    /// <summary>
    /// Diffuse un nouveau message à tous les membres du chat.
    /// Appelé par le MessageController après persistance.
    /// </summary>
    public async Task BroadcastMessage(Guid chatId, ChatMessageDto message)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("NewMessage", message);
    }

    /// <summary>
    /// Diffuse la modification d'un message à tous les membres du chat.
    /// </summary>
    public async Task BroadcastMessageEdited(Guid chatId, ChatMessageDto message)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("MessageEdited", message);
    }

    /// <summary>
    /// Diffuse la suppression d'un message à tous les membres du chat.
    /// </summary>
    public async Task BroadcastMessageDeleted(Guid chatId, Guid messageId)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("MessageDeleted", new { ChatId = chatId, MessageId = messageId });
    }

    /// <summary>
    /// Notifie un chat qu'un utilisateur a lu jusqu'à un certain message.
    /// </summary>
    public async Task BroadcastReadReceipt(Guid chatId, string userId, Guid messageId)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("ReadReceipt", new { ChatId = chatId, UserId = userId, MessageId = messageId });
    }

    /// <summary>
    /// Notifie tous les membres d'un changement de réaction sur un message.
    /// </summary>
    public async Task BroadcastReactionToggled(Guid chatId, ChatMessageDto message)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("ReactionToggled", message);
    }

    /// <summary>
    /// Notifie tous les membres qu'un nouveau participant a rejoint le groupe.
    /// </summary>
    public async Task BroadcastMemberAdded(Guid chatId, ChatMemberDto member)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("MemberAdded", new { ChatId = chatId, Member = member });
    }

    /// <summary>
    /// Notifie tous les membres qu'un participant a été retiré du groupe.
    /// </summary>
    public async Task BroadcastMemberRemoved(Guid chatId, string removedUserId)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("MemberRemoved", new { ChatId = chatId, UserId = removedUserId });
    }

    /// <summary>
    /// Notifie tous les membres que le groupe a été renommé.
    /// </summary>
    public async Task BroadcastGroupRenamed(Guid chatId, string newName)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("GroupRenamed", new { ChatId = chatId, NewName = newName });
    }

    /// <summary>
    /// Notifie le nouvel utilisateur qu'il a été ajouté à un chat
    /// et lui permet de rejoindre le groupe SignalR.
    /// </summary>
    public async Task BroadcastAddedToChat(string targetUserId, ChatDto chat)
    {
        await Clients.Group(UserGroup(targetUserId))
            .SendAsync("AddedToChat", chat);
    }

    /// <summary>
    /// Notifie tous les membres qu'un message a été épinglé.
    /// </summary>
    public async Task BroadcastMessagePinned(Guid chatId, ChatMessageDto message)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("MessagePinned", message);
    }

    /// <summary>
    /// Notifie tous les membres qu'un message a été désépinglé.
    /// </summary>
    public async Task BroadcastMessageUnpinned(Guid chatId, ChatMessageDto message)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("MessageUnpinned", message);
    }

    /// <summary>
    /// Notifie l'utilisateur retiré qu'il a été supprimé d'un chat.
    /// </summary>
    public async Task BroadcastRemovedFromChat(string targetUserId, Guid chatId)
    {
        await Clients.Group(UserGroup(targetUserId))
            .SendAsync("RemovedFromChat", new { ChatId = chatId });
    }

    /// <summary>
    /// Notifie les membres d'un chat qu'un appel audio/vidéo est en cours.
    /// </summary>
    public async Task BroadcastIncomingCall(Guid chatId, string callerId, string roomName, bool isVideo)
    {
        await Clients.OthersInGroup(ChatGroup(chatId))
            .SendAsync("IncomingCall", new { ChatId = chatId, CallerId = callerId, RoomName = roomName, IsVideo = isVideo });
    }

    /// <summary>
    /// Notifie les membres qu'un appel a pris fin.
    /// </summary>
    public async Task BroadcastCallEnded(Guid chatId, string userId)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("CallEnded", new { ChatId = chatId, UserId = userId });
    }

    /// <summary>
    /// Notifie les membres qu'un appel a été refusé.
    /// </summary>
    public async Task BroadcastCallRejected(Guid chatId, string userId)
    {
        await Clients.Group(ChatGroup(chatId))
            .SendAsync("CallRejected", new { ChatId = chatId, UserId = userId });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string? GetUserId()
        => Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
}
