export interface CreateDirectChatRequest {
  /** The other user's Id. */
  targetUserId: string;
}

export interface CreateGroupChatRequest {
  name: string;
  /** Initial member Ids (the creator is added automatically). */
  memberIds: string[];
}

export interface RenameGroupRequest {
  name: string;
}

export interface AddMemberRequest {
  userId: string;
}

export interface SendMessageRequest {
  content: string;
  replyToMessageId?: string;
}

export interface EditMessageRequest {
  content: string;
}

export interface MarkAsReadRequest {
  messageId: string; // Guid
}

export interface AddReactionRequest {
  emoji: string;
}
