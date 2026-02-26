using System.Security.Claims;
using API.Hubs;
using API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Models.DTOs;

namespace API.Controllers;

/// <summary>
/// Contrôleur pour les appels audio/vidéo via Twilio Video.
/// Génère des tokens d'accès Twilio et notifie les participants via SignalR.
/// </summary>
[ApiController]
[Route("api/chats/{chatId:guid}/call")]
[Authorize]
public class VideoCallController : ControllerBase
{
    private readonly IVideoCallService _videoCallService;
    private readonly IChatService _chatService;
    private readonly IChatNotificationService _chatNotificationService;
    private readonly IHubContext<ChatHub> _hub;
    private readonly IActiveCallTracker _activeCallTracker;
    private readonly IPresenceTracker _presenceTracker;
    private const string CHAT_GROUP = "chat_";

    public VideoCallController(
        IVideoCallService videoCallService,
        IChatService chatService,
        IChatNotificationService chatNotificationService,
        IHubContext<ChatHub> hub,
        IActiveCallTracker activeCallTracker,
        IPresenceTracker presenceTracker)
    {
        _videoCallService = videoCallService;
        _chatService = chatService;
        _chatNotificationService = chatNotificationService;
        _hub = hub;
        _activeCallTracker = activeCallTracker;
        _presenceTracker = presenceTracker;
    }

    /// <summary>
    /// Génère un token Twilio Video pour rejoindre un appel dans ce chat.
    /// Le room name est dérivé du chatId pour que tous les participants soient dans la même room.
    /// Émet IncomingCall aux autres membres UNIQUEMENT si c'est le premier participant (nouvel appel).
    /// Quand un destinataire accepte l'appel, il obtient un token sans réémettre IncomingCall.
    /// </summary>
    [HttpPost("token")]
    public async Task<IActionResult> GetCallToken(Guid chatId, [FromBody] StartCallRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            // Vérifier que l'utilisateur est membre du chat
            if (!await _chatService.IsMemberAsync(chatId, userId))
                return Forbid();

            var roomName = $"municipaligo_chat_{chatId}";
            var token = _videoCallService.GenerateToken(userId, roomName);

            // Enregistrer le participant. Si c'est le premier → c'est un nouvel appel.
            var isNewCall = _activeCallTracker.TryStartCall(roomName, userId);

            if (isNewCall)
            {
                // Résoudre le nom de l'appelant
                var chat = await _chatService.GetChatByIdAsync(chatId, userId);
                var callerMember = chat.Members.FirstOrDefault(m => m.UserId == userId);
                var callerName = callerMember?.User != null
                    ? $"{callerMember.User.FirstName} {callerMember.User.LastName}"
                    : "Quelqu'un";

                // Récupérer les connectionIds de l'appelant pour l'exclure de la diffusion
                var callerConnectionIds = await _presenceTracker.GetConnectionsForUserAsync(userId);

                // Notifier tous les autres membres du chat (exclure l'appelant)
                await _hub.Clients.GroupExcept($"{CHAT_GROUP}{chatId}", callerConnectionIds)
                    .SendAsync("IncomingCall", new
                    {
                        ChatId = chatId,
                        CallerId = userId,
                        CallerName = callerName,
                        RoomName = roomName,
                        IsVideo = request.IsVideo
                    });

                // Envoyer une push notification high-priority à TOUS les autres membres
                // pour réveiller l'app et afficher l'écran d'appel entrant,
                // même si l'app est fermée ou en arrière-plan
                foreach (var member in chat.Members.Where(m => m.UserId != userId))
                {
                    await _chatNotificationService.SendCallNotificationAsync(
                        member.UserId, chatId, callerName, request.IsVideo);
                }
            }

            return Ok(new VideoTokenResponse
            {
                Token = token,
                RoomName = roomName,
                ChatId = chatId
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to generate call token: {ex.Message}" });
        }
    }

    /// <summary>
    /// Notifie les autres membres que l'utilisateur a raccroché / terminé l'appel.
    /// Si c'est le dernier participant, la room est supprimée immédiatement.
    /// </summary>
    [HttpPost("hangup")]
    public async Task<IActionResult> HangUp(Guid chatId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        if (!await _chatService.IsMemberAsync(chatId, userId))
            return Forbid();

        var roomName = $"municipaligo_chat_{chatId}";
        var isLastParticipant = _activeCallTracker.ParticipantLeft(roomName, userId);

        // Si c'était le dernier (ou le seul) participant, forcer la suppression
        // pour que la prochaine tentative d'appel crée bien une nouvelle room
        if (isLastParticipant)
            _activeCallTracker.EndCall(roomName);

        await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
            .SendAsync("CallEnded", new { ChatId = chatId, UserId = userId });

        return NoContent();
    }

    /// <summary>
    /// Notifie les autres membres que l'utilisateur a refusé l'appel.
    /// Nettoie également la room si elle était encore active.
    /// </summary>
    [HttpPost("reject")]
    public async Task<IActionResult> RejectCall(Guid chatId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        if (!await _chatService.IsMemberAsync(chatId, userId))
            return Forbid();

        var roomName = $"municipaligo_chat_{chatId}";

        // Retirer le refusant de la room (si jamais il y était) et nettoyer si vide
        var isLastParticipant = _activeCallTracker.ParticipantLeft(roomName, userId);
        if (isLastParticipant)
            _activeCallTracker.EndCall(roomName);

        await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
            .SendAsync("CallRejected", new { ChatId = chatId, UserId = userId });

        return NoContent();
    }
}
