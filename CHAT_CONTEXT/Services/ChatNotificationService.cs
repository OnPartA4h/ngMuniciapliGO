using API.Services.Interfaces;
using FirebaseAdmin.Messaging;
using Microsoft.EntityFrameworkCore;
using Models.Data;
using FcmNotification = FirebaseAdmin.Messaging.Notification;

namespace API.Services;

/// <summary>
/// Gère les push notifications Firebase spécifiques au chat.
/// Séparé de NotificationService qui gère les notifications de problèmes.
/// </summary>
public class ChatNotificationService : IChatNotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IPresenceTracker _presenceTracker;
    private readonly ILogger<ChatNotificationService> _logger;

    public ChatNotificationService(
        ApplicationDbContext context,
        IPresenceTracker presenceTracker,
        ILogger<ChatNotificationService> logger)
    {
        _context = context;
        _presenceTracker = presenceTracker;
        _logger = logger;
    }

    public async Task SendNewMessageNotificationAsync(
        string recipientUserId,
        string senderName,
        string chatName,
        string messagePreview,
        Guid chatId)
    {
        // Skip push if user is connected to SignalR (already receiving in real-time)
        if (_presenceTracker.IsOnline(recipientUserId)) return;

        var token = await GetFcmTokenAsync(recipientUserId);
        if (token == null) return;

        await SendAsync(
            recipientUserId,
            token,
            title: chatName,
            body: $"{senderName}: {messagePreview}",
            data: new Dictionary<string, string>
            {
                { "type", "new_message" },
                { "chatId", chatId.ToString() }
            });
    }

    public async Task SendMessageToMembersAsync(
        Guid chatId,
        string senderUserId,
        string senderName,
        string messagePreview)
    {
        var members = await _context.ChatMembers
            .Include(m => m.User)
            .Where(m => m.ChatId == chatId && m.UserId != senderUserId)
            .ToListAsync();

        var chat = await _context.Chats.FindAsync(chatId);
        if (chat == null) return;

        var tasks = members
            .Where(m => m.User != null
                     && m.User.NotificationsEnabled
                     && m.User.NotifyChatMessages
                     && !string.IsNullOrEmpty(m.User.FcmToken)
                     && !_presenceTracker.IsOnline(m.UserId))  // Skip users connected to SignalR
            .Select(m => SendAsync(
                m.UserId,
                m.User.FcmToken!,
                title: chat.Name ?? senderName,
                body: $"{senderName}: {messagePreview}",
                data: new Dictionary<string, string>
                {
                    { "type", "new_message" },
                    { "chatId", chatId.ToString() }
                }));

        await Task.WhenAll(tasks);
    }

    public async Task SendAddedToGroupNotificationAsync(
        string recipientUserId,
        string groupName,
        string addedByName)
    {
        // Skip push if user is connected to SignalR (already receiving AddedToChat event)
        if (_presenceTracker.IsOnline(recipientUserId)) return;

        var token = await GetFcmTokenAsync(recipientUserId);
        if (token == null) return;

        await SendAsync(
            recipientUserId,
            token,
            title: "Nouveau groupe",
            body: $"{addedByName} vous a ajouté au groupe « {groupName} ».",
            data: new Dictionary<string, string>
            {
                { "type", "added_to_group" }
            });
    }

    public async Task SendCallNotificationAsync(
        string recipientUserId,
        Guid chatId,
        string callerName,
        bool isVideo)
    {
        // For calls, bypass NotifyChatMessages — calls should always ring
        var fcmToken = await GetFcmTokenForCallAsync(recipientUserId);
        if (fcmToken == null) return;

        var callType = isVideo ? "vidéo" : "audio";
        var roomName = $"municipaligo_chat_{chatId}";

        try
        {
            // High-priority data message to wake the app even when killed/closed
            // and trigger a full-screen incoming call UI on the device
            var message = new Message
            {
                Token = fcmToken,
                Data = new Dictionary<string, string>
                {
                    { "type", "incoming_call" },
                    { "chatId", chatId.ToString() },
                    { "callerName", callerName },
                    { "isVideo", isVideo.ToString().ToLower() },
                    { "roomName", roomName }
                },
                Android = new AndroidConfig
                {
                    Priority = Priority.High,
                    TimeToLive = TimeSpan.FromSeconds(60),
                    Notification = new AndroidNotification
                    {
                        ChannelId = "incoming_calls",
                        Title = "Appel entrant",
                        Body = $"{callerName} vous appelle ({callType}).",
                        Priority = NotificationPriority.MAX,
                        Sound = "ringtone",
                        DefaultVibrateTimings = true
                    }
                },
                Apns = new ApnsConfig
                {
                    Headers = new Dictionary<string, string>
                    {
                        { "apns-priority", "10" },
                        { "apns-push-type", "voip" }
                    },
                    Aps = new Aps
                    {
                        ContentAvailable = true,
                        Sound = "ringtone.aiff",
                        CustomData = new Dictionary<string, object>
                        {
                            { "category", "INCOMING_CALL" }
                        }
                    }
                }
            };

            await FirebaseMessaging.DefaultInstance.SendAsync(message);
            _logger.LogInformation(
                "Push notification d'appel envoyée à {UserId} (room={Room})",
                recipientUserId, roomName);
        }
        catch (FirebaseMessagingException ex) when (ex.MessagingErrorCode == MessagingErrorCode.Unregistered)
        {
            _logger.LogWarning("Token FCM invalide pour l'utilisateur {UserId}, suppression.", recipientUserId);
            var user = await _context.Users.FindAsync(recipientUserId);
            if (user != null)
            {
                user.FcmToken = null;
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Échec de l'envoi de la push d'appel à {UserId}", recipientUserId);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string?> GetFcmTokenAsync(string userId)
    {
        var user = await _context.Users
            .Where(u => u.Id == userId
                     && u.NotificationsEnabled
                     && u.NotifyChatMessages
                     && !string.IsNullOrEmpty(u.FcmToken))
            .Select(u => u.FcmToken)
            .FirstOrDefaultAsync();

        return user;
    }

    /// <summary>
    /// Returns FCM token for call notifications.
    /// No preference checks — calls must ALWAYS ring regardless of notification settings.
    /// </summary>
    private async Task<string?> GetFcmTokenForCallAsync(string userId)
    {
        return await _context.Users
            .Where(u => u.Id == userId && !string.IsNullOrEmpty(u.FcmToken))
            .Select(u => u.FcmToken)
            .FirstOrDefaultAsync();
    }

    private async Task SendAsync(
        string userId,
        string token,
        string title,
        string body,
        Dictionary<string, string>? data = null)
    {
        try
        {
            var message = new Message
            {
                Token = token,
                Notification = new FcmNotification
                {
                    Title = title,
                    Body = body
                },
                Data = data
            };

            await FirebaseMessaging.DefaultInstance.SendAsync(message);
            _logger.LogInformation("Push notification envoyée à l'utilisateur {UserId}", userId);
        }
        catch (FirebaseMessagingException ex) when (ex.MessagingErrorCode == MessagingErrorCode.Unregistered)
        {
            _logger.LogWarning("Token FCM invalide pour l'utilisateur {UserId}, suppression.", userId);
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.FcmToken = null;
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Échec de l'envoi de la push notification à l'utilisateur {UserId}", userId);
        }
    }
}
