export enum ChatType {
  Direct = 'Direct',
  Group  = 'Group',
}

export enum ChatMemberRole {
  Member = 'Member',
  Admin  = 'Admin',
}

// Response DTOs

export interface ChatMemberDto {
  userId:string;
  displayName:string;
  profilePictureUrl:string | null;
  role:ChatMemberRole;
  joinedAt:string; // ISO date
}

export interface MessageReactionDto {
  userId:string;
  displayName:string;
  emoji:string;
}

export interface ChatMessageDto {
  id:string; // Guid
  chatId:string; // Guid
  senderId:string | null;
  senderName:string | null;
  senderPictureUrl:string | null;
  content:string;
  createdAt:string; // ISO date
  editedAt:string | null;
  isDeleted:boolean;
  isSystemMessage:boolean;
  reactions:MessageReactionDto[];
}

export interface ChatDto {
  id:string; // Guid
  type:ChatType;
  name:string | null;
  createdAt:string; // ISO date
  members:ChatMemberDto[];
}

export interface ChatSummaryDto {
  id:string; // Guid
  type:ChatType;
  /** Group name, or the other participant's display name for direct chats. */
  displayName:string;
  /** Avatar of the other participant (direct chats only). */
  otherUserPictureUrl:string | null;
  lastMessage:ChatMessageDto | null;
  /** Number of messages the current user hasn't read yet. */
  unreadCount:number;
  createdAt:string; // ISO date
}

/** Résultat de la recherche d'utilisateurs pour la création d'un chat. */
export interface UserSearchResultDto {
  id:string;
  fullName:string;
  role:string;
}
