/**
 * Doit correspondre au backend C# :
 *   public enum ChatType { Direct, Group }
 * JSON par défaut → 0, 1 (entiers).
 */
export enum ChatType {
  Direct = 0,
  Group  = 1,
}

/**
 * Doit correspondre au backend C# :
 *   public enum ChatMemberRole { Member, Admin }
 * JSON par défaut → 0, 1 (entiers).
 */
export enum ChatMemberRole {
  Member = 0,
  Admin  = 1,
}

// Response DTOs

export interface ChatMemberDto {
  userId: string;
  displayName: string;
  profilePictureUrl: string | null;
  role: ChatMemberRole;
  joinedAt: string; // ISO date
}

export interface MessageReactionDto {
  userId: string;
  displayName: string;
  emoji: string;
}

export interface ReplyToDto {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  attachmentType: string | null;
  isVoiceMessage: boolean;
  isDeleted: boolean;
}

export interface ChatMessageDto {
  id: string; // Guid
  chatId: string; // Guid
  senderId: string | null;
  senderName: string | null;
  senderPictureUrl: string | null;
  content: string;
  createdAt: string; // ISO date
  editedAt: string | null;
  isDeleted: boolean;
  isSystemMessage: boolean;
  attachmentUrl: string | null;
  attachmentType: string | null;
  isPinned: boolean;
  isVoiceMessage: boolean;
  voiceDurationSeconds: number | null;
  reactions: MessageReactionDto[];
  replyTo: ReplyToDto | null;
}

export interface ChatDto {
  id: string; // Guid
  type: ChatType;
  name: string | null;
  createdAt: string; // ISO date
  members: ChatMemberDto[];
}

export interface ChatSummaryDto {
  id: string; // Guid
  type: ChatType;
  /** Group name, or the other participant's display name for direct chats. */
  displayName: string;
  /** Avatar of the other participant (direct chats only). */
  otherUserPictureUrl: string | null;
  /** ID of the other participant (direct chats only). */
  otherUserId: string | null;
  lastMessage: ChatMessageDto | null;
  /** Number of messages the current user hasn't read yet. */
  unreadCount: number;
  createdAt: string; // ISO date
}

/** Résultat de la recherche d'utilisateurs pour la création d'un chat. */
export interface UserSearchResultDto {
  id: string;
  fullName: string;
  profilePictureUrl: string | null;
  role: string;
}

// ─── Video Call DTOs ─────────────────────────────────────────────────────

export interface VideoTokenResponse {
  token: string;
  roomName: string;
  chatId: string;
}

export interface StartCallRequest {
  isVideo: boolean;
}

export interface IncomingCallEvent {
  // Server may send PascalCase or camelCase — both are handled in the hub service
  ChatId:     string;
  CallerId:   string;
  CallerName: string;
  IsVideo:    boolean;
  RoomName:   string;
  // camelCase aliases (populated after normalization)
  chatId:     string;
  callerId:   string;
  callerName: string;
  isVideo:    boolean;
  roomName:   string;
}

export interface CallEndedEvent {
  ChatId?: string;
  chatId?: string;
}

export interface CallRejectedEvent {
  ChatId?: string;
  chatId?: string;
}
