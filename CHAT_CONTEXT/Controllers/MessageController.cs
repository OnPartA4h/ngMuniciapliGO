using System.Security.Claims;
using API.Hubs;
using API.Services.Interfaces;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using API.Services;
using Models.DTOs;

namespace API.Controllers;

/// <summary>
/// Contrôleur REST pour les messages, les accusés de lecture et les réactions.
/// Persiste via le service, puis diffuse l'événement en temps réel via SignalR
/// et envoie les push notifications Firebase via IChatNotificationService.
/// </summary>
[ApiController]
[Route("api/chats/{chatId:guid}/messages")]
[Authorize]
public class MessageController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IChatNotificationService _chatNotificationService;
    private readonly IHubContext<ChatHub> _hub;
    private readonly IAmazonS3 _s3Client;
    private readonly SupabaseS3Config _s3Config;
    private const string CHAT_GROUP = "chat_";

    public MessageController(
        IChatService chatService,
        IChatNotificationService chatNotificationService,
        IHubContext<ChatHub> hub,
        IAmazonS3 s3Client,
        IOptions<SupabaseS3Config> s3Config)
    {
        _chatService = chatService;
        _chatNotificationService = chatNotificationService;
        _hub = hub;
        _s3Client = s3Client;
        _s3Config = s3Config.Value;
    }

    // ── Récupération ──────────────────────────────────────────────────────────

    /// <summary>
    /// Retourne les messages d'un chat en ordre décroissant (le plus récent en premier).
    /// Supporte la pagination par curseur via <c>beforeMessageId</c>.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMessages(
        Guid chatId,
        [FromQuery] Guid? beforeMessageId = null,
        [FromQuery] int pageSize = 50)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var messages = await _chatService.GetMessagesAsync(chatId, userId, beforeMessageId, pageSize);
            var dtos = messages.Select(m => new ChatMessageDto(m)).ToList();
            return Ok(dtos);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // ── Envoi ─────────────────────────────────────────────────────────────────

    /// <summary>Envoie un nouveau message dans le chat.</summary>
    [HttpPost]
    public async Task<IActionResult> SendMessage(Guid chatId, [FromBody] SendMessageRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var message = await _chatService.SendMessageAsync(chatId, userId, request.Content, request.ReplyToMessageId);
            var dto = new ChatMessageDto(message);

            // SignalR : diffuser en temps réel
            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("NewMessage", dto);

            // Firebase : push aux autres membres
            var senderName = message.Sender != null
                ? $"{message.Sender.FirstName} {message.Sender.LastName}"
                : "Quelqu'un";
            var preview = request.Content.Length > 100
                ? request.Content[..100] + "…"
                : request.Content;

            await _chatNotificationService.SendMessageToMembersAsync(chatId, userId, senderName, preview);

            return CreatedAtAction(nameof(GetMessages), new { chatId }, dto);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ── Modification / Suppression ────────────────────────────────────────────

    /// <summary>Modifie le contenu d'un message (auteur uniquement).</summary>
    [HttpPatch("{messageId:guid}")]
    public async Task<IActionResult> EditMessage(
        Guid chatId, Guid messageId, [FromBody] EditMessageRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var message = await _chatService.EditMessageAsync(messageId, userId, request.Content);
            var dto = new ChatMessageDto(message);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("MessageEdited", dto);

            return Ok(dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Supprime (soft-delete) un message.</summary>
    [HttpDelete("{messageId:guid}")]
    public async Task<IActionResult> DeleteMessage(Guid chatId, Guid messageId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            await _chatService.DeleteMessageAsync(messageId, userId);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("MessageDeleted", new { ChatId = chatId, MessageId = messageId });

            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ── Accusés de lecture ────────────────────────────────────────────────────

    /// <summary>
    /// Marque un message comme lu et avance le curseur de lecture de l'utilisateur.
    /// Retourne le nombre de messages non lus restants dans ce chat.
    /// </summary>
    [HttpPost("{messageId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid chatId, Guid messageId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var unread = await _chatService.MarkAsReadAsync(chatId, userId, messageId);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("ReadReceipt", new { ChatId = chatId, UserId = userId, MessageId = messageId });

            return Ok(new { unreadCount = unread });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // ── Réactions ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Bascule une réaction emoji sur un message.
    /// Ajoute la réaction si absente, la retire si déjà présente.
    /// </summary>
    [HttpPost("{messageId:guid}/reactions")]
    public async Task<IActionResult> ToggleReaction(
        Guid chatId, Guid messageId, [FromBody] AddReactionRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            await _chatService.ToggleReactionAsync(messageId, userId, request.Emoji);

            var history = await _chatService.GetMessagesAsync(chatId, userId, null, 100);
            var updatedMessage = history.FirstOrDefault(m => m.Id == messageId);

            if (updatedMessage == null)
                return NotFound(new { message = "Message introuvable." });

            var dto = new ChatMessageDto(updatedMessage);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("ReactionToggled", dto);

            return Ok(dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ── Recherche de messages ─────────────────────────────────────────────────

    /// <summary>
    /// Recherche dans les messages d'un chat par contenu textuel.
    /// Retourne les résultats en ordre décroissant (le plus récent en premier).
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchMessages(
        Guid chatId,
        [FromQuery] string q,
        [FromQuery] int pageSize = 50)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(q))
            return Ok(new List<ChatMessageDto>());

        try
        {
            var messages = await _chatService.SearchMessagesAsync(chatId, userId, q, pageSize);
            var dtos = messages.Select(m => new ChatMessageDto(m)).ToList();
            return Ok(dtos);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // ── Upload de fichiers ────────────────────────────────────────────────────

    /// <summary>
    /// Envoie un message avec un fichier attaché (image, document, etc.).
    /// Le fichier est stocké dans le blob storage (Supabase S3) et l'URL est retournée.
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAttachment(
        Guid chatId,
        [FromForm] UploadAttachmentRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var file = request.File;
        var content = request.Content;

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        // Limite de taille : 10 MB
        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "File size exceeds 10 MB limit." });

        try
        {
            // Upload vers Supabase S3
            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var key = $"chat-attachments/{fileName}";

            using (var stream = file.OpenReadStream())
            {
                var putRequest = new PutObjectRequest
                {
                    InputStream = stream,
                    Key = key,
                    BucketName = _s3Config.BucketName,
                    ContentType = file.ContentType,
                    CannedACL = S3CannedACL.PublicRead
                };

                await _s3Client.PutObjectAsync(putRequest);
            }

            var baseUrl = _s3Config.ServiceUrl.Replace("/storage/v1/s3", "");
            var publicUrl = $"{baseUrl}/storage/v1/object/public/{_s3Config.BucketName}/{key}";

            var message = await _chatService.SendMessageWithAttachmentAsync(
                chatId, userId, content, publicUrl, file.ContentType, request.ReplyToMessageId);
            var dto = new ChatMessageDto(message);

            // SignalR : diffuser en temps réel
            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("NewMessage", dto);

            // Firebase : push aux autres membres
            var senderName = message.Sender != null
                ? $"{message.Sender.FirstName} {message.Sender.LastName}"
                : "Quelqu'un";
            var preview = string.IsNullOrEmpty(content) ? "📎 Fichier attaché" : content;
            if (preview.Length > 100) preview = preview[..100] + "…";

            await _chatNotificationService.SendMessageToMembersAsync(chatId, userId, senderName, preview);

            return CreatedAtAction(nameof(GetMessages), new { chatId }, dto);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Upload failed: {ex.Message}" });
        }
    }

    // ── Épinglage de messages ─────────────────────────────────────────────────

    /// <summary>Épingle un message dans le chat.</summary>
    [HttpPost("{messageId:guid}/pin")]
    public async Task<IActionResult> PinMessage(Guid chatId, Guid messageId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var message = await _chatService.PinMessageAsync(chatId, messageId, userId);
            var dto = new ChatMessageDto(message);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("MessagePinned", dto);

            return Ok(dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Désépingle un message du chat.</summary>
    [HttpDelete("{messageId:guid}/pin")]
    public async Task<IActionResult> UnpinMessage(Guid chatId, Guid messageId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var message = await _chatService.UnpinMessageAsync(chatId, messageId, userId);
            var dto = new ChatMessageDto(message);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("MessageUnpinned", dto);

            return Ok(dto);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Retourne tous les messages épinglés d'un chat.</summary>
    [HttpGet("pinned")]
    public async Task<IActionResult> GetPinnedMessages(Guid chatId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        try
        {
            var messages = await _chatService.GetPinnedMessagesAsync(chatId, userId);
            var dtos = messages.Select(m => new ChatMessageDto(m)).ToList();
            return Ok(dtos);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Messages vocaux ───────────────────────────────────────────────────────

    /// <summary>
    /// Envoie un message vocal. Le fichier audio est uploadé dans le blob storage.
    /// </summary>
    [HttpPost("voice")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SendVoiceMessage(
        Guid chatId,
        [FromForm] UploadVoiceMessageRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) return Unauthorized();

        var file = request.File;
        var durationSeconds = request.DurationSeconds;

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No audio file provided." });

        // Limite de taille : 25 MB pour les messages vocaux
        if (file.Length > 25 * 1024 * 1024)
            return BadRequest(new { message = "Voice message exceeds 25 MB limit." });

        // Valider le type MIME audio
        if (!file.ContentType.StartsWith("audio/"))
            return BadRequest(new { message = "File must be an audio file." });

        try
        {
            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var key = $"chat-voice/{fileName}";

            using (var stream = file.OpenReadStream())
            {
                var putRequest = new PutObjectRequest
                {
                    InputStream = stream,
                    Key = key,
                    BucketName = _s3Config.BucketName,
                    ContentType = file.ContentType,
                    CannedACL = S3CannedACL.PublicRead
                };

                await _s3Client.PutObjectAsync(putRequest);
            }

            var baseUrl = _s3Config.ServiceUrl.Replace("/storage/v1/s3", "");
            var publicUrl = $"{baseUrl}/storage/v1/object/public/{_s3Config.BucketName}/{key}";

            var message = await _chatService.SendVoiceMessageAsync(
                chatId, userId, publicUrl, file.ContentType, durationSeconds, request.ReplyToMessageId);
            var dto = new ChatMessageDto(message);

            await _hub.Clients.Group($"{CHAT_GROUP}{chatId}")
                .SendAsync("NewMessage", dto);

            var senderName = message.Sender != null
                ? $"{message.Sender.FirstName} {message.Sender.LastName}"
                : "Quelqu'un";

            await _chatNotificationService.SendMessageToMembersAsync(
                chatId, userId, senderName, "🎤 Message vocal");

            return CreatedAtAction(nameof(GetMessages), new { chatId }, dto);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Voice upload failed: {ex.Message}" });
        }
    }
}
