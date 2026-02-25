import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatMessageDto } from '../models/chat';
import { AddReactionRequest, EditMessageRequest, SendMessageRequest } from '../models/chat-requests';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  private base(chatId: string): string {
    return `${this.apiUrl}/api/chats/${chatId}/messages`;
  }

  // ── Récupération ─────────────────────────────────────────────────────────

  /**
   * Retourne les messages d'un chat (du plus récent au plus ancien).
   * Pagination par curseur : passer `beforeMessageId` pour charger les messages plus anciens.
   */
  async getMessages(
    chatId: string,
    beforeMessageId?: string,
    pageSize: number = 50
  ): Promise<ChatMessageDto[]> {
    let params = new HttpParams().set('pageSize', pageSize.toString());
    if (beforeMessageId) {
      params = params.set('beforeMessageId', beforeMessageId);
    }
    return await lastValueFrom(
      this.http.get<ChatMessageDto[]>(this.base(chatId), { params })
    );
  }

  // ── Envoi / Modification / Suppression ───────────────────────────────────

  /** Envoie un nouveau message dans le chat. */
  async sendMessage(chatId: string, request: SendMessageRequest): Promise<ChatMessageDto> {
    return await lastValueFrom(
      this.http.post<ChatMessageDto>(this.base(chatId), request)
    );
  }

  /** Modifie le contenu d'un message (auteur uniquement). */
  async editMessage(chatId: string, messageId: string, request: EditMessageRequest): Promise<ChatMessageDto> {
    return await lastValueFrom(
      this.http.patch<ChatMessageDto>(`${this.base(chatId)}/${messageId}`, request)
    );
  }

  /** Supprime (soft-delete) un message. */
  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    await lastValueFrom(
      this.http.delete<void>(`${this.base(chatId)}/${messageId}`)
    );
  }

  // ── Accusés de lecture ───────────────────────────────────────────────────

  /**
   * Marque un message comme lu et avance le curseur de lecture.
   * Retourne le nombre de messages non lus restants dans ce chat.
   */
  async markAsRead(chatId: string, messageId: string): Promise<{ unreadCount: number }> {
    return await lastValueFrom(
      this.http.post<{ unreadCount: number }>(`${this.base(chatId)}/${messageId}/read`, null)
    );
  }

  // ── Réactions ────────────────────────────────────────────────────────────

  /**
   * Bascule une réaction emoji sur un message.
   * Ajoute la réaction si absente, la retire si déjà présente.
   * Retourne le message mis à jour avec la liste des réactions.
   */
  async toggleReaction(chatId: string, messageId: string, request: AddReactionRequest): Promise<ChatMessageDto> {
    return await lastValueFrom(
      this.http.post<ChatMessageDto>(`${this.base(chatId)}/${messageId}/reactions`, request)
    );
  }
}
