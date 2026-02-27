using Microsoft.AspNetCore.Http;
using Models.Enums;
using Models.Models;

namespace Models.DTOs;

// ─── Request DTOs ────────────────────────────────────────────────────────────

public class CreateDirectChatRequest
{
    /// <summary>The other user's Id.</summary>
    public string TargetUserId { get; set; } = string.Empty;
}

public class CreateGroupChatRequest
{
    public string Name { get; set; } = string.Empty;
    /// <summary>Initial member Ids (the creator is added automatically).</summary>
    public List<string> MemberIds { get; set; } = new();
}

public class RenameGroupRequest
{
    public string Name { get; set; } = string.Empty;
}

public class AddMemberRequest
{
    public string UserId { get; set; } = string.Empty;
}

public class SendMessageRequest
{
    public string Content { get; set; } = string.Empty;
    /// <summary>Optional: Id of the message being replied to.</summary>
    public Guid? ReplyToMessageId { get; set; }
}

public class EditMessageRequest
{
    public string Content { get; set; } = string.Empty;
}

public class MarkAsReadRequest
{
    public Guid MessageId { get; set; }
}

public class AddReactionRequest
{
    public string Emoji { get; set; } = string.Empty;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

public class ChatMemberDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public ChatMemberRole Role { get; set; }
    public DateTime JoinedAt { get; set; }

    public ChatMemberDto() { }

    public ChatMemberDto(ChatMember m)
    {
        UserId = m.UserId;
        DisplayName = m.User != null ? $"{m.User.FirstName} {m.User.LastName}" : m.UserId;
        ProfilePictureUrl = m.User?.ProfilePictureUrl;
        Role = m.Role;
        JoinedAt = m.JoinedAt;
    }
}

public class MessageReactionDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;

    public MessageReactionDto() { }

    public MessageReactionDto(MessageReaction r)
    {
        UserId = r.UserId;
        DisplayName = r.User != null ? $"{r.User.FirstName} {r.User.LastName}" : r.UserId;
        Emoji = r.Emoji;
    }
}

public class ChatMessageDto
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public string? SenderId { get; set; }
    public string? SenderName { get; set; }
    public string? SenderPictureUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsSystemMessage { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentType { get; set; }
    public bool IsPinned { get; set; }
    public bool IsVoiceMessage { get; set; }
    public int? VoiceDurationSeconds { get; set; }
    public List<MessageReactionDto> Reactions { get; set; } = new();
    public ReplyToDto? ReplyTo { get; set; }

    public ChatMessageDto() { }

    public ChatMessageDto(ChatMessage m)
    {
        Id = m.Id;
        ChatId = m.ChatId;
        SenderId = m.SenderId;
        SenderName = m.Sender != null ? $"{m.Sender.FirstName} {m.Sender.LastName}" : null;
        SenderPictureUrl = m.Sender?.ProfilePictureUrl;
        Content = m.DeletedAt.HasValue ? "" : m.Content;
        CreatedAt = m.CreatedAt;
        EditedAt = m.EditedAt;
        IsDeleted = m.DeletedAt.HasValue;
        IsSystemMessage = m.IsSystemMessage;
        AttachmentUrl = m.AttachmentUrl;
        AttachmentType = m.AttachmentType;
        IsPinned = m.IsPinned;
        IsVoiceMessage = m.IsVoiceMessage;
        VoiceDurationSeconds = m.VoiceDurationSeconds;
        Reactions = m.Reactions.Select(r => new MessageReactionDto(r)).ToList();
        ReplyTo = m.ReplyToMessage != null ? new ReplyToDto(m.ReplyToMessage) : null;
    }
}

/// <summary>
/// Lightweight DTO representing the original message being replied to.
/// Contains just enough info to render a reply preview in the UI.
/// </summary>
public class ReplyToDto
{
    public Guid Id { get; set; }
    public string? SenderId { get; set; }
    public string? SenderName { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AttachmentType { get; set; }
    public bool IsVoiceMessage { get; set; }
    public bool IsDeleted { get; set; }

    public ReplyToDto() { }

    public ReplyToDto(ChatMessage m)
    {
        Id = m.Id;
        SenderId = m.SenderId;
        SenderName = m.Sender != null ? $"{m.Sender.FirstName} {m.Sender.LastName}" : null;
        Content = m.DeletedAt.HasValue ? "" : (m.Content.Length > 200 ? m.Content[..200] + "…" : m.Content);
        AttachmentType = m.AttachmentType;
        IsVoiceMessage = m.IsVoiceMessage;
        IsDeleted = m.DeletedAt.HasValue;
    }
}

public class ChatDto
{
    public Guid Id { get; set; }
    public ChatType Type { get; set; }
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ChatMemberDto> Members { get; set; } = new();

    public ChatDto() { }

    public ChatDto(Chat c)
    {
        Id = c.Id;
        Type = c.Type;
        Name = c.Name;
        CreatedAt = c.CreatedAt;
        Members = c.Members.Select(m => new ChatMemberDto(m)).ToList();
    }
}

public class ChatSummaryDto
{
    public Guid Id { get; set; }
    public ChatType Type { get; set; }

    /// <summary>
    /// For group chats: the group name.
    /// For direct chats: the other participant's display name.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>For direct chats: the other participant's avatar.</summary>
    public string? OtherUserPictureUrl { get; set; }

    public ChatMessageDto? LastMessage { get; set; }

    /// <summary>Number of messages the current user hasn't read yet.</summary>
    public int UnreadCount { get; set; }

    public DateTime CreatedAt { get; set; }
}

// ─── Search DTOs ─────────────────────────────────────────────────────────────

/// <summary>
/// Résultat de recherche d'un utilisateur pour la création d'un chat.
/// Retourne uniquement le nom complet, le rôle et l'ID.
/// </summary>
public class ChatUserSearchResultDTO
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public string Role { get; set; } = string.Empty;

    public ChatUserSearchResultDTO() { }

    public ChatUserSearchResultDTO(User user, string role)
    {
        Id = user.Id;
        FullName = $"{user.FirstName} {user.LastName}";
        ProfilePictureUrl = user.ProfilePictureUrl;
        Role = role;
    }
}

// ─── Video Call DTOs ─────────────────────────────────────────────────────────

/// <summary>Request to start or join a video/audio call.</summary>
public class StartCallRequest
{
    /// <summary>True for video call, false for audio-only call.</summary>
    public bool IsVideo { get; set; } = true;
}

/// <summary>Response containing a Twilio Video access token.</summary>
public class VideoTokenResponse
{
    public string Token { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public Guid ChatId { get; set; }
}

// ─── Upload DTOs ─────────────────────────────────────────────────────────────

/// <summary>Request DTO for uploading a file attachment with an optional text caption.</summary>
public class UploadAttachmentRequest
{
    /// <summary>The file to upload (image, document, GIF, etc.).</summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>Optional text content / caption for the message.</summary>
    public string? Content { get; set; }

    /// <summary>Optional: Id of the message being replied to.</summary>
    public Guid? ReplyToMessageId { get; set; }
}

/// <summary>Request DTO for uploading a voice message.</summary>
public class UploadVoiceMessageRequest
{
    /// <summary>The audio file to upload.</summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>Duration of the voice message in seconds.</summary>
    public int DurationSeconds { get; set; } = 0;

    /// <summary>Optional: Id of the message being replied to.</summary>
    public Guid? ReplyToMessageId { get; set; }
}
