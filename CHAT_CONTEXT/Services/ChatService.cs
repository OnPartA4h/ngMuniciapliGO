using API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Models.Data;
using Models.DTOs;
using Models.Enums;
using Models.Models;

namespace API.Services;

public class ChatService : IChatService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ChatService> _logger;
    private const int DEFAULT_PAGE_SIZE = 50;

    public ChatService(ApplicationDbContext context, ILogger<ChatService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Chat creation ────────────────────────────────────────────────────────

    public async Task<Chat> GetOrCreateDirectChatAsync(string requestingUserId, string targetUserId)
    {
        if (requestingUserId == targetUserId)
            throw new InvalidOperationException("Cannot create a direct chat with yourself.");

        // Check that the target user exists
        var targetExists = await _context.Users.AnyAsync(u => u.Id == targetUserId && !u.IsDeleted);
        if (!targetExists)
            throw new KeyNotFoundException("Target user not found.");

        // Look for an existing direct chat between both users
        var existing = await _context.Chats
            .Include(c => c.Members)
            .Where(c => c.Type == ChatType.Direct
                     && c.Members.Any(m => m.UserId == requestingUserId)
                     && c.Members.Any(m => m.UserId == targetUserId))
            .FirstOrDefaultAsync();

        if (existing != null)
            return existing;

        var chat = new Chat { Type = ChatType.Direct };
        chat.Members.Add(new ChatMember { UserId = requestingUserId, Role = ChatMemberRole.Admin });
        chat.Members.Add(new ChatMember { UserId = targetUserId,   Role = ChatMemberRole.Admin });

        _context.Chats.Add(chat);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Direct chat {ChatId} created between {A} and {B}", chat.Id, requestingUserId, targetUserId);
        return chat;
    }

    public async Task<Chat> CreateGroupChatAsync(string creatorId, string name, IEnumerable<string> memberIds)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Group name cannot be empty.");

        var allMemberIds = memberIds.Distinct().ToList();

        // Minimum 3 members in a group (including the creator)
        if (allMemberIds.Count < 3)
            throw new ArgumentException("A group chat requires at least 3 members (including the creator).");

        // Validate all members exist
        var existingCount = await _context.Users
            .CountAsync(u => allMemberIds.Contains(u.Id) && !u.IsDeleted);
        if (existingCount != allMemberIds.Count)
            throw new KeyNotFoundException("One or more member users were not found.");

        var chat = new Chat { Type = ChatType.Group, Name = name };

        // Creator is admin
        chat.Members.Add(new ChatMember { UserId = creatorId, Role = ChatMemberRole.Admin });

        foreach (var memberId in allMemberIds.Where(id => id != creatorId))
            chat.Members.Add(new ChatMember { UserId = memberId, Role = ChatMemberRole.Member });

        _context.Chats.Add(chat);

        // System message: group created
        _context.ChatMessages.Add(new ChatMessage
        {
            ChatId = chat.Id,
            SenderId = null,
            Content = $"Group \"{name}\" was created.",
            IsSystemMessage = true
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation("Group chat {ChatId} \"{Name}\" created by {UserId}", chat.Id, name, creatorId);
        return chat;
    }

    // ── Fetching ─────────────────────────────────────────────────────────────

    public async Task<List<ChatSummaryDto>> GetMyChatsAsync(string userId)
    {
        var memberChatIds = await _context.ChatMembers
            .Where(cm => cm.UserId == userId)
            .Select(cm => cm.ChatId)
            .ToListAsync();

        var chats = await _context.Chats
            .Include(c => c.Members).ThenInclude(m => m.User)
            .Where(c => memberChatIds.Contains(c.Id))
            .ToListAsync();

        var summaries = new List<ChatSummaryDto>();

        foreach (var chat in chats)
        {
            var lastMessage = await _context.ChatMessages
                .Include(m => m.Sender)
                .Include(m => m.Reactions).ThenInclude(r => r.User)
                .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
                .Where(m => m.ChatId == chat.Id)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            var membership = chat.Members.First(m => m.UserId == userId);
            var unread = await GetUnreadCountAsync(chat.Id, userId);

            var summary = new ChatSummaryDto
            {
                Id = chat.Id,
                Type = chat.Type,
                CreatedAt = chat.CreatedAt,
                LastMessage = lastMessage != null ? new ChatMessageDto(lastMessage) : null,
                UnreadCount = unread
            };

            if (chat.Type == ChatType.Group)
            {
                summary.DisplayName = chat.Name ?? "Group";
            }
            else
            {
                var other = chat.Members.FirstOrDefault(m => m.UserId != userId);
                summary.DisplayName = other?.User != null
                    ? $"{other.User.FirstName} {other.User.LastName}"
                    : "Unknown";
                summary.OtherUserPictureUrl = other?.User?.ProfilePictureUrl;
            }

            summaries.Add(summary);
        }

        // Sort: most recently active first
        return summaries
            .OrderByDescending(s => s.LastMessage?.CreatedAt ?? s.CreatedAt)
            .ToList();
    }

    public async Task<List<Guid>> GetChatIdsForUserAsync(string userId)
    {
        return await _context.ChatMembers
            .Where(cm => cm.UserId == userId)
            .Select(cm => cm.ChatId)
            .ToListAsync();
    }

    public async Task<List<string>> GetContactUserIdsAsync(string userId)
    {
        // Get all chatIds the user belongs to
        var chatIds = await _context.ChatMembers
            .Where(cm => cm.UserId == userId)
            .Select(cm => cm.ChatId)
            .ToListAsync();

        // Get all distinct user IDs from those chats, excluding the user themselves
        var contactIds = await _context.ChatMembers
            .Where(cm => chatIds.Contains(cm.ChatId) && cm.UserId != userId)
            .Select(cm => cm.UserId)
            .Distinct()
            .ToListAsync();

        return contactIds;
    }

    public async Task<Chat> GetChatByIdAsync(Guid chatId, string requestingUserId)
    {
        var chat = await _context.Chats
            .Include(c => c.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == chatId);

        if (chat == null)
            throw new KeyNotFoundException("Chat not found.");

        if (chat.Members.All(m => m.UserId != requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        return chat;
    }

    // ── Group management ─────────────────────────────────────────────────────

    public async Task RenameGroupAsync(Guid chatId, string requestingUserId, string newName)
    {
        var chat = await GetChatByIdAsync(chatId, requestingUserId);

        if (chat.Type != ChatType.Group)
            throw new InvalidOperationException("Only group chats can be renamed.");

        if (!await IsAdminAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("Only admins can rename the group.");

        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Group name cannot be empty.");

        var oldName = chat.Name;
        chat.Name = newName;

        _context.ChatMessages.Add(new ChatMessage
        {
            ChatId = chatId,
            SenderId = null,
            Content = $"Group was renamed from \"{oldName}\" to \"{newName}\".",
            IsSystemMessage = true
        });

        await _context.SaveChangesAsync();
    }

    public async Task AddMemberAsync(Guid chatId, string requestingUserId, string targetUserId)
    {
        var chat = await GetChatByIdAsync(chatId, requestingUserId);

        if (chat.Type != ChatType.Group)
            throw new InvalidOperationException("Cannot add members to a direct chat.");

        if (!await IsAdminAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("Only admins can add members.");

        if (chat.Members.Any(m => m.UserId == targetUserId))
            throw new InvalidOperationException("User is already a member of this chat.");

        var user = await _context.Users.FindAsync(targetUserId)
            ?? throw new KeyNotFoundException("User not found.");

        _context.ChatMembers.Add(new ChatMember
        {
            ChatId = chatId,
            UserId = targetUserId,
            Role = ChatMemberRole.Member
        });

        _context.ChatMessages.Add(new ChatMessage
        {
            ChatId = chatId,
            SenderId = null,
            Content = $"{user.FirstName} {user.LastName} joined the group.",
            IsSystemMessage = true
        });

        await _context.SaveChangesAsync();
    }

    public async Task RemoveMemberAsync(Guid chatId, string requestingUserId, string targetUserId)
    {
        var chat = await GetChatByIdAsync(chatId, requestingUserId);

        if (chat.Type != ChatType.Group)
            throw new InvalidOperationException("Cannot remove members from a direct chat.");

        if (!await IsAdminAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("Only admins can remove members.");

        if (requestingUserId == targetUserId)
            throw new InvalidOperationException("Use LeaveChat to remove yourself.");

        var membership = chat.Members.FirstOrDefault(m => m.UserId == targetUserId)
            ?? throw new KeyNotFoundException("User is not a member of this chat.");

        _context.ChatMembers.Remove(membership);

        var user = await _context.Users.FindAsync(targetUserId);
        _context.ChatMessages.Add(new ChatMessage
        {
            ChatId = chatId,
            SenderId = null,
            Content = $"{(user != null ? $"{user.FirstName} {user.LastName}" : targetUserId)} was removed from the group.",
            IsSystemMessage = true
        });

        await _context.SaveChangesAsync();
    }

    public async Task LeaveChatAsync(Guid chatId, string userId)
    {
        var chat = await GetChatByIdAsync(chatId, userId);

        var membership = chat.Members.FirstOrDefault(m => m.UserId == userId)
            ?? throw new KeyNotFoundException("You are not a member of this chat.");

        _context.ChatMembers.Remove(membership);

        if (chat.Type == ChatType.Group)
        {
            var user = await _context.Users.FindAsync(userId);
            _context.ChatMessages.Add(new ChatMessage
            {
                ChatId = chatId,
                SenderId = null,
                Content = $"{(user != null ? $"{user.FirstName} {user.LastName}" : userId)} left the group.",
                IsSystemMessage = true
            });

            // If the leaver was the only admin, promote the next member
            var remainingMembers = chat.Members.Where(m => m.UserId != userId).ToList();
            var hasAdmin = remainingMembers.Any(m => m.Role == ChatMemberRole.Admin);

            if (!hasAdmin && remainingMembers.Count > 0)
            {
                var nextAdmin = remainingMembers.OrderBy(m => m.JoinedAt).First();
                var memberEntity = await _context.ChatMembers
                    .FirstAsync(cm => cm.ChatId == chatId && cm.UserId == nextAdmin.UserId);
                memberEntity.Role = ChatMemberRole.Admin;

                var promotedUser = await _context.Users.FindAsync(nextAdmin.UserId);
                _context.ChatMessages.Add(new ChatMessage
                {
                    ChatId = chatId,
                    SenderId = null,
                    Content = $"{(promotedUser != null ? $"{promotedUser.FirstName} {promotedUser.LastName}" : nextAdmin.UserId)} is now an admin.",
                    IsSystemMessage = true
                });
            }
        }

        await _context.SaveChangesAsync();
    }

    // ── Membership helpers ───────────────────────────────────────────────────

    public async Task<ChatMember?> GetMemberAsync(Guid chatId, string userId)
        => await _context.ChatMembers.FirstOrDefaultAsync(cm => cm.ChatId == chatId && cm.UserId == userId);

    public async Task<bool> IsMemberAsync(Guid chatId, string userId)
        => await _context.ChatMembers.AnyAsync(cm => cm.ChatId == chatId && cm.UserId == userId);

    public async Task<bool> IsAdminAsync(Guid chatId, string userId)
        => await _context.ChatMembers.AnyAsync(cm =>
            cm.ChatId == chatId &&
            cm.UserId == userId &&
            cm.Role == ChatMemberRole.Admin);

    public async Task<List<string>> GetChatMemberIdsAsync(Guid chatId, string? excludeUserId = null)
    {
        var query = _context.ChatMembers.Where(cm => cm.ChatId == chatId);
        if (excludeUserId != null)
            query = query.Where(cm => cm.UserId != excludeUserId);
        return await query.Select(cm => cm.UserId).ToListAsync();
    }

    // ── Messages ─────────────────────────────────────────────────────────────

    public async Task<ChatMessage> SendMessageAsync(Guid chatId, string senderId, string content, Guid? replyToMessageId = null)
    {
        if (!await IsMemberAsync(chatId, senderId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("Message content cannot be empty.");

        if (replyToMessageId.HasValue)
        {
            var replyTarget = await _context.ChatMessages
                .AnyAsync(m => m.Id == replyToMessageId.Value && m.ChatId == chatId);
            if (!replyTarget)
                throw new KeyNotFoundException("The message being replied to was not found in this chat.");
        }

        var message = new ChatMessage
        {
            ChatId = chatId,
            SenderId = senderId,
            Content = content.Trim(),
            ReplyToMessageId = replyToMessageId
        };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        // Reload with sender for broadcasting
        await _context.Entry(message).Reference(m => m.Sender).LoadAsync();
        await _context.Entry(message).Collection(m => m.Reactions).LoadAsync();
        if (replyToMessageId.HasValue)
        {
            await _context.Entry(message).Reference(m => m.ReplyToMessage).LoadAsync();
            if (message.ReplyToMessage != null)
                await _context.Entry(message.ReplyToMessage).Reference(r => r.Sender).LoadAsync();
        }

        return message;
    }

    public async Task<ChatMessage> EditMessageAsync(Guid messageId, string requestingUserId, string newContent)
    {
        var message = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId)
            ?? throw new KeyNotFoundException("Message not found.");

        if (message.SenderId != requestingUserId)
            throw new UnauthorizedAccessException("You can only edit your own messages.");

        if (message.DeletedAt.HasValue)
            throw new InvalidOperationException("Cannot edit a deleted message.");

        if (message.IsSystemMessage)
            throw new InvalidOperationException("Cannot edit system messages.");

        if (string.IsNullOrWhiteSpace(newContent))
            throw new ArgumentException("Message content cannot be empty.");

        message.Content = newContent.Trim();
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return message;
    }

    public async Task DeleteMessageAsync(Guid messageId, string requestingUserId)
    {
        var message = await _context.ChatMessages
            .FirstOrDefaultAsync(m => m.Id == messageId)
            ?? throw new KeyNotFoundException("Message not found.");

        // The sender or a chat admin can delete
        var isAdmin = await IsAdminAsync(message.ChatId, requestingUserId);

        if (message.SenderId != requestingUserId && !isAdmin)
            throw new UnauthorizedAccessException("You do not have permission to delete this message.");

        if (message.IsSystemMessage)
            throw new InvalidOperationException("Cannot delete system messages.");

        message.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<ChatMessage>> GetMessagesAsync(
        Guid chatId, string requestingUserId,
        Guid? beforeMessageId = null, int pageSize = DEFAULT_PAGE_SIZE)
    {
        if (!await IsMemberAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
            .Where(m => m.ChatId == chatId)
            .AsQueryable();

        if (beforeMessageId.HasValue)
        {
            var cursor = await _context.ChatMessages
                .Where(m => m.Id == beforeMessageId.Value)
                .Select(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            if (cursor != default)
                query = query.Where(m => m.CreatedAt < cursor);
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(pageSize)
            .ToListAsync();
    }

    // ── Read receipts ────────────────────────────────────────────────────────

    public async Task<int> MarkAsReadAsync(Guid chatId, string userId, Guid messageId)
    {
        var membership = await _context.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == chatId && cm.UserId == userId)
            ?? throw new UnauthorizedAccessException("You are not a member of this chat.");

        // Only advance, never go backwards
        if (membership.LastReadMessageId.HasValue)
        {
            var currentReadAt = await _context.ChatMessages
                .Where(m => m.Id == membership.LastReadMessageId.Value)
                .Select(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            var newReadAt = await _context.ChatMessages
                .Where(m => m.Id == messageId)
                .Select(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            if (currentReadAt >= newReadAt) return await GetUnreadCountAsync(chatId, userId);
        }

        membership.LastReadMessageId = messageId;
        await _context.SaveChangesAsync();

        return await GetUnreadCountAsync(chatId, userId);
    }

    public async Task<int> GetUnreadCountAsync(Guid chatId, string userId)
    {
        var membership = await _context.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == chatId && cm.UserId == userId);

        if (membership == null) return 0;

        if (!membership.LastReadMessageId.HasValue)
        {
            // Never read anything — all messages are unread
            return await _context.ChatMessages
                .CountAsync(m => m.ChatId == chatId && m.SenderId != userId);
        }

        var lastReadAt = await _context.ChatMessages
            .Where(m => m.Id == membership.LastReadMessageId.Value)
            .Select(m => m.CreatedAt)
            .FirstOrDefaultAsync();

        return await _context.ChatMessages
            .CountAsync(m => m.ChatId == chatId
                          && m.SenderId != userId
                          && m.CreatedAt > lastReadAt);
    }

    // ── Reactions ────────────────────────────────────────────────────────────

    public async Task<MessageReaction?> ToggleReactionAsync(Guid messageId, string userId, string emoji)
    {
        if (string.IsNullOrWhiteSpace(emoji))
            throw new ArgumentException("Emoji cannot be empty.");

        var message = await _context.ChatMessages.FindAsync(messageId)
            ?? throw new KeyNotFoundException("Message not found.");

        if (!await IsMemberAsync(message.ChatId, userId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        var existing = await _context.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == emoji);

        if (existing != null)
        {
            // Remove reaction (toggle off)
            _context.MessageReactions.Remove(existing);
            await _context.SaveChangesAsync();
            return null;
        }

        var reaction = new MessageReaction
        {
            MessageId = messageId,
            UserId = userId,
            Emoji = emoji
        };

        _context.MessageReactions.Add(reaction);
        await _context.SaveChangesAsync();

        // Load the User navigation property after save to avoid EF tracking conflicts
        await _context.Entry(reaction).Reference(r => r.User).LoadAsync();

        return reaction;
    }

    // ── Search ───────────────────────────────────────────────────────────────

    public async Task<List<ChatMessage>> SearchMessagesAsync(
        Guid chatId, string requestingUserId, string query, int pageSize = 50)
    {
        if (!await IsMemberAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        if (string.IsNullOrWhiteSpace(query))
            return new List<ChatMessage>();

        pageSize = Math.Clamp(pageSize, 1, 100);
        var lowerQuery = query.ToLower();

        return await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
            .Where(m => m.ChatId == chatId
                     && !m.DeletedAt.HasValue
                     && !m.IsSystemMessage
                     && m.Content.ToLower().Contains(lowerQuery))
            .OrderByDescending(m => m.CreatedAt)
            .Take(pageSize)
            .ToListAsync();
    }

    // ── Attachments ──────────────────────────────────────────────────────────

    public async Task<ChatMessage> SendMessageWithAttachmentAsync(
        Guid chatId, string senderId, string? content, string attachmentUrl, string attachmentType, Guid? replyToMessageId = null)
    {
        if (!await IsMemberAsync(chatId, senderId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        if (replyToMessageId.HasValue)
        {
            var replyTarget = await _context.ChatMessages
                .AnyAsync(m => m.Id == replyToMessageId.Value && m.ChatId == chatId);
            if (!replyTarget)
                throw new KeyNotFoundException("The message being replied to was not found in this chat.");
        }

        var message = new ChatMessage
        {
            ChatId = chatId,
            SenderId = senderId,
            Content = content?.Trim() ?? "",
            AttachmentUrl = attachmentUrl,
            AttachmentType = attachmentType,
            ReplyToMessageId = replyToMessageId
        };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        // Reload with sender for broadcasting
        await _context.Entry(message).Reference(m => m.Sender).LoadAsync();
        await _context.Entry(message).Collection(m => m.Reactions).LoadAsync();
        if (replyToMessageId.HasValue)
        {
            await _context.Entry(message).Reference(m => m.ReplyToMessage).LoadAsync();
            if (message.ReplyToMessage != null)
                await _context.Entry(message.ReplyToMessage).Reference(r => r.Sender).LoadAsync();
        }

        return message;
    }

    // ── Voice Messages ───────────────────────────────────────────────────────

    public async Task<ChatMessage> SendVoiceMessageAsync(
        Guid chatId, string senderId, string attachmentUrl, string attachmentType, int durationSeconds, Guid? replyToMessageId = null)
    {
        if (!await IsMemberAsync(chatId, senderId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        if (replyToMessageId.HasValue)
        {
            var replyTarget = await _context.ChatMessages
                .AnyAsync(m => m.Id == replyToMessageId.Value && m.ChatId == chatId);
            if (!replyTarget)
                throw new KeyNotFoundException("The message being replied to was not found in this chat.");
        }

        var message = new ChatMessage
        {
            ChatId = chatId,
            SenderId = senderId,
            Content = "🎤 Voice message",
            AttachmentUrl = attachmentUrl,
            AttachmentType = attachmentType,
            IsVoiceMessage = true,
            VoiceDurationSeconds = durationSeconds,
            ReplyToMessageId = replyToMessageId
        };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        await _context.Entry(message).Reference(m => m.Sender).LoadAsync();
        await _context.Entry(message).Collection(m => m.Reactions).LoadAsync();
        if (replyToMessageId.HasValue)
        {
            await _context.Entry(message).Reference(m => m.ReplyToMessage).LoadAsync();
            if (message.ReplyToMessage != null)
                await _context.Entry(message.ReplyToMessage).Reference(r => r.Sender).LoadAsync();
        }

        return message;
    }

    // ── Pinning ──────────────────────────────────────────────────────────────

    public async Task<ChatMessage> PinMessageAsync(Guid chatId, Guid messageId, string requestingUserId)
    {
        if (!await IsMemberAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        var message = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChatId == chatId)
            ?? throw new KeyNotFoundException("Message not found in this chat.");

        if (message.DeletedAt.HasValue)
            throw new InvalidOperationException("Cannot pin a deleted message.");

        message.IsPinned = true;
        await _context.SaveChangesAsync();

        return message;
    }

    public async Task<ChatMessage> UnpinMessageAsync(Guid chatId, Guid messageId, string requestingUserId)
    {
        if (!await IsMemberAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        var message = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChatId == chatId)
            ?? throw new KeyNotFoundException("Message not found in this chat.");

        message.IsPinned = false;
        await _context.SaveChangesAsync();

        return message;
    }

    public async Task<List<ChatMessage>> GetPinnedMessagesAsync(Guid chatId, string requestingUserId)
    {
        if (!await IsMemberAsync(chatId, requestingUserId))
            throw new UnauthorizedAccessException("You are not a member of this chat.");

        return await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyToMessage).ThenInclude(r => r!.Sender)
            .Where(m => m.ChatId == chatId && m.IsPinned && !m.DeletedAt.HasValue)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }
}
