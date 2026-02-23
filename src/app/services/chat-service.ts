import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatDto, ChatSummaryDto } from '../models/chat';
import {
  AddMemberRequest,
  AddReactionRequest,
  CreateDirectChatRequest,
  CreateGroupChatRequest,
  RenameGroupRequest,
} from '../models/chat-requests';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;
  private readonly base = `${this.apiUrl}/api/Chat`;

  // ── Récupération ────────────────────────────────────────────────────────────

  /** Retourne tous les chats de l'utilisateur connecté avec leur résumé. */
  async getMyChats(): Promise<ChatSummaryDto[]> {
    return await lastValueFrom(
      this.http.get<ChatSummaryDto[]>(this.base)
    );
  }

  /** Retourne les détails complets d'un chat (membres inclus). */
  async getChat(chatId: string): Promise<ChatDto> {
    return await lastValueFrom(
      this.http.get<ChatDto>(`${this.base}/${chatId}`)
    );
  }

  // ── Création ────────────────────────────────────────────────────────────────

  /**
   * Crée ou retourne un chat direct (1-to-1) avec un autre utilisateur.
   * Idempotent : retourne le chat existant si déjà créé.
   */
  async getOrCreateDirectChat(request: CreateDirectChatRequest): Promise<ChatDto> {
    return await lastValueFrom(
      this.http.post<ChatDto>(`${this.base}/direct`, request)
    );
  }

  /** Crée un nouveau groupe de chat. */
  async createGroupChat(request: CreateGroupChatRequest): Promise<ChatDto> {
    return await lastValueFrom(
      this.http.post<ChatDto>(`${this.base}/group`, request)
    );
  }

  // ── Gestion du groupe ───────────────────────────────────────────────────────

  /** Renomme un groupe (admin seulement). */
  async renameGroup(chatId: string, request: RenameGroupRequest): Promise<void> {
    await lastValueFrom(
      this.http.patch<void>(`${this.base}/${chatId}/name`, request)
    );
  }

  /** Ajoute un membre au groupe (admin seulement). */
  async addMember(chatId: string, request: AddMemberRequest): Promise<void> {
    await lastValueFrom(
      this.http.post<void>(`${this.base}/${chatId}/members`, request)
    );
  }

  /** Retire un membre du groupe (admin seulement). */
  async removeMember(chatId: string, targetUserId: string): Promise<void> {
    await lastValueFrom(
      this.http.delete<void>(`${this.base}/${chatId}/members/${targetUserId}`)
    );
  }

  /** L'utilisateur connecté quitte le chat. */
  async leaveChat(chatId: string): Promise<void> {
    await lastValueFrom(
      this.http.post<void>(`${this.base}/${chatId}/leave`, null)
    );
  }
}
