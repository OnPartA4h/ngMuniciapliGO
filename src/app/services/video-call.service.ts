import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StartCallRequest, VideoTokenResponse } from '../models/chat';

@Injectable({
  providedIn: 'root',
})
export class VideoCallService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private base(chatId: string): string {
    return `${this.apiUrl}/api/chats/${chatId}/call`;
  }

  /** Obtient un token Twilio Video pour rejoindre/démarrer un appel. */
  async getCallToken(chatId: string, isVideo: boolean): Promise<VideoTokenResponse> {
    const request: StartCallRequest = { isVideo };
    return await lastValueFrom(
      this.http.post<VideoTokenResponse>(`${this.base(chatId)}/token`, request)
    );
  }

  /** Notifie le backend que l'utilisateur a raccroché. */
  async hangUp(chatId: string): Promise<void> {
    await lastValueFrom(
      this.http.post<void>(`${this.base(chatId)}/hangup`, null)
    );
  }

  /** Notifie le backend que l'utilisateur a refusé l'appel. */
  async rejectCall(chatId: string): Promise<void> {
    await lastValueFrom(
      this.http.post<void>(`${this.base(chatId)}/reject`, null)
    );
  }
}
