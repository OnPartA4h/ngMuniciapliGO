using System.Security.Claims;
using API.Hubs;
using API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Models.DTOs;
using Models.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IChatNotificationService _chatNotificationService;
    private readonly IHubContext<ChatHub> _hub;
    private readonly IPresenceTracker _presenceTracker;
    private readonly UserManager<User> _userManager;
    private const string CHAT_GROUP = "chat_";
    private const string USER_GROUP = "user_";

    public ChatController(
        IChatService chatService,
        IChatNotificationService chatNotificationService,
        IHubContext<ChatHub> hub,
        IPresenceTracker presenceTracker,
        UserManager<User> userManager)
    {
        _chatService = chatService;
        _chatNotificationService = chatNotificationService;
        _hub = hub;
        _presenceTracker = presenceTracker;
        _userManager = userManager;
    }

    // ── Récupération ──────────────────────────────────────────────────────────

    /// <summary>Retourne tous les chats de l'utilisateur connecté avec leur résumé.</summary>
    [HttpGet]
    public async Task<IActionResult> GetMyChats()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var chats = await _chatService.GetMyChatsAsync(userId);
        return Ok(chats);
    }

    /// <summary>Retourne les détails complets d'un chat (membres inclus).</summary>
    [HttpGet("{chatId:guid}")]
    public async Task<IActionResult> GetChat(Guid chatId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var chat = await _chatService.GetChatByIdAsync(chatId, userId);
            return Ok(new ChatDto(chat));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Création ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Crée ou retourne un chat direct (1-to-1) avec un autre utilisateur.
    /// Si le chat existe déjà, retourne le chat existant (idempotent).
    /// </summary>
    [HttpPost("direct")]
    public async Task<IActionResult> GetOrCreateDirectChat([FromBody] CreateDirectChatRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var chat = await _chatService.GetOrCreateDirectChatAsync(userId, request.TargetUserId);
            var dto = new ChatDto(chat);

            // Auto-join les connexions actives de l'autre utilisateur au groupe du chat
            var targetConnections = await _presenceTracker.GetConnectionsForUserAsync(request.TargetUserId);
            foreach (var connId in targetConnections)
                await _hub.Groups.AddToGroupAsync(connId, $"{CHAT_GROUP}{chat.Id}");

            // Auto-join les connexions actives de l'appelant aussi (si multi-appareils)
            var callerConnections = await _presenceTracker.GetConnectionsForUserAsync(userId);
            foreach (var connId in callerConnections)
                await _hub.Groups.AddToGroupAsync(connId, $"{CHAT_GROUP}{chat.Id}");

            await _hub.Clients.Group($"{USER_GROUP}{request.TargetUserId}")
                .SendAsync("AddedToChat", dto);

            // Envoyer un snapshot de présence aux deux participants pour ce nouveau chat
            await SendChatPresenceSnapshotAsync(chat.Id, userId);
            await SendChatPresenceSnapshotAsync(chat.Id, request.TargetUserId);

            return Ok(dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Crée un nouveau groupe de chat.</summary>
    [HttpPost("group")]
    public async Task<IActionResult> CreateGroupChat([FromBody] CreateGroupChatRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var allMembers = request.MemberIds
                .Append(userId)
                .Distinct()
                .ToList();

            var chat = await _chatService.CreateGroupChatAsync(userId, request.Name, allMembers);
            var dto = new ChatDto(chat);

            // Récupérer le nom de l'admin créateur pour les notifications
            var creator = chat.Members.FirstOrDefault(m => m.UserId == userId);
            var creatorName = creator?.User != null
                ? $"{creator.User.FirstName} {creator.User.LastName}"
                : "Quelqu'un";

            foreach (var member in chat.Members.Where(m => m.UserId != userId))
            {
                // Auto-join les connexions actives du membre au groupe du chat
                var memberConnections = await _presenceTracker.GetConnectionsForUserAsync(member.UserId);
                foreach (var connId in memberConnections)
                    await _hub.Groups.AddToGroupAsync(connId, $"{CHAT_GROUP}{chat.Id}");

                // SignalR : notifier le nouveau membre
                await _hub.Clients.Group($"{USER_GROUP}{member.UserId}")
                    .SendAsync("AddedToChat", dto);

                // Firebase : push notification
                await _chatNotificationService.SendAddedToGroupNotificationAsync(
                    member.UserId, request.Name, creatorName);
            }

            // Auto-join les connexions du créateur aussi
            var creatorConnections = await _presenceTracker.GetConnectionsForUserAsync(userId);
            foreach (var connId in creatorConnections)
                await _hub.Groups.AddToGroupAsync(connId, $"{CHAT_GROUP}{chat.Id}");

            // Envoyer un snapshot de présence à tous les membres du nouveau groupe
            foreach (var member in chat.Members)
                await SendChatPresenceSnapshotAsync(chat.Id, member.UserId);

            return CreatedAtAction(nameof(GetChat), new { chatId = chat.Id }, dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ── Gestion du groupe ─────────────────────────────────────────────────────

    /// <summary>Renomme un groupe (admin seulement).</summary>
    [HttpPatch("{chatId:guid}/name")]
    public async Task<IActionResult> RenameGroup(Guid chatId, [FromBody] RenameGroupRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            await _chatService.RenameGroupAsync(chatId, userId, request.Name);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("GroupRenamed", new { ChatId = chatId, NewName = request.Name });

            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Ajoute un membre au groupe (admin seulement).</summary>
    [HttpPost("{chatId:guid}/members")]
    public async Task<IActionResult> AddMember(Guid chatId, [FromBody] AddMemberRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            await _chatService.AddMemberAsync(chatId, userId, request.UserId);

            var chat = await _chatService.GetChatByIdAsync(chatId, userId);
            var dto = new ChatDto(chat);
            var newMember = chat.Members.FirstOrDefault(m => m.UserId == request.UserId);

            if (newMember != null)
            {
                var memberDto = new ChatMemberDto(newMember);

                // Auto-join les connexions actives du nouveau membre au groupe du chat
                var newMemberConnections = await _presenceTracker.GetConnectionsForUserAsync(request.UserId);
                foreach (var connId in newMemberConnections)
                    await _hub.Groups.AddToGroupAsync(connId, $"{CHAT_GROUP}{chatId}");

                await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                    .SendAsync("MemberAdded", new { ChatId = chatId, Member = memberDto });

                await _hub.Clients.Group($"{USER_GROUP}{request.UserId}")
                    .SendAsync("AddedToChat", dto);

                // Firebase : notifier le nouveau membre
                var adder = chat.Members.FirstOrDefault(m => m.UserId == userId);
                var adderName = adder?.User != null
                    ? $"{adder.User.FirstName} {adder.User.LastName}"
                    : "Quelqu'un";

                await _chatNotificationService.SendAddedToGroupNotificationAsync(
                    request.UserId, chat.Name ?? "Groupe", adderName);

                // Envoyer un snapshot de présence au nouveau membre pour ce chat
                await SendChatPresenceSnapshotAsync(chatId, request.UserId);
            }

            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Retire un membre du groupe (admin seulement).</summary>
    [HttpDelete("{chatId:guid}/members/{targetUserId}")]
    public async Task<IActionResult> RemoveMember(Guid chatId, string targetUserId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            await _chatService.RemoveMemberAsync(chatId, userId, targetUserId);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("MemberRemoved", new { ChatId = chatId, UserId = targetUserId });

            await _hub.Clients.Group($"{USER_GROUP}{targetUserId}")
                .SendAsync("RemovedFromChat", new { ChatId = chatId });

            // Retirer les connexions actives de l'utilisateur exclu du groupe SignalR
            var removedConnections = await _presenceTracker.GetConnectionsForUserAsync(targetUserId);
            foreach (var connId in removedConnections)
                await _hub.Groups.RemoveFromGroupAsync(connId, $"{CHAT_GROUP}{chatId}");

            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>L'utilisateur connecté quitte le chat.</summary>
    [HttpPost("{chatId:guid}/leave")]
    public async Task<IActionResult> LeaveChat(Guid chatId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            await _chatService.LeaveChatAsync(chatId, userId);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("MemberRemoved", new { ChatId = chatId, UserId = userId });

            // Retirer les connexions actives de l'utilisateur du groupe SignalR
            var leavingConnections = await _presenceTracker.GetConnectionsForUserAsync(userId);
            foreach (var connId in leavingConnections)
                await _hub.Groups.RemoveFromGroupAsync(connId, $"{CHAT_GROUP}{chatId}");

            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Recherche d'utilisateurs ──────────────────────────────────────────────

    /// <summary>
    /// Recherche des utilisateurs par prénom, nom ou email.
    /// Retourne au maximum 20 résultats. Utilisé pour initier un chat direct ou de groupe.
    /// </summary>
    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<ChatUserSearchResultDTO>());

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserId == null) return Unauthorized();

        var searchLower = q.ToLowerInvariant();

        var users = _userManager.Users
            .Where(u => !u.IsDeleted
                     && u.Id != currentUserId
                     && (u.FirstName.ToLower().Contains(searchLower)
                      || u.LastName.ToLower().Contains(searchLower)
                      || (u.Email != null && u.Email.ToLower().Contains(searchLower))
                      || (u.NormalizedUserName != null && u.NormalizedUserName.Contains(q.ToUpperInvariant()))))
            .Take(20)
            .ToList();

        var results = new List<ChatUserSearchResultDTO>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var primaryRole = roles.FirstOrDefault() ?? string.Empty;
            results.Add(new ChatUserSearchResultDTO(user, primaryRole));
        }

        return Ok(results);
    }

    // ── Helpers privés ────────────────────────────────────────────────────────

    /// <summary>
    /// Envoie un snapshot de présence (ChatOnlineUsers) à un utilisateur pour un chat donné.
    /// Indique quels membres du chat sont actuellement en ligne.
    /// </summary>
    private async Task SendChatPresenceSnapshotAsync(Guid chatId, string userId)
    {
        var memberIds = await _chatService.GetChatMemberIdsAsync(chatId, excludeUserId: userId);
        var onlineMemberIds = memberIds.Where(id => _presenceTracker.IsOnline(id)).ToList();
        if (onlineMemberIds.Any())
        {
            await _hub.Clients.Group($"{USER_GROUP}{userId}")
                .SendAsync("ChatOnlineUsers", new { ChatId = chatId, UserIds = onlineMemberIds });
        }
    }
}
