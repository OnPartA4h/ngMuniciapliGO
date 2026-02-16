import { Injectable, NgZone, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationHubService {
  private ngZone = inject(NgZone);
  private notificationService = inject(NotificationService);

  private hubConnection?: signalR.HubConnection;
  
  // Signal for AI processing count
  readonly duplicateProcessingCount = signal<number>(0);

  async startConnection(token: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to notification hub');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notification`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    // Écouter les notifications entrantes
    this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
      this.ngZone.run(() => {
        console.log('New notification received:', notification);
        // Émettre la notification et mettre à jour le compteur instantanément
        this.notificationService.addNotification(notification);
      });
    });

    // Écouter les mises à jour du nombre de signalements en traitement
    this.hubConnection.on('DuplicateProcessingCount', (count: number) => {
      this.ngZone.run(() => {
        console.log('Duplicate processing count updated:', count);
        this.duplicateProcessingCount.set(count);
      });
    });

    await this.hubConnection
      .start()
      .then(() => console.log('Connected to notification hub'))
      .catch(err => console.log('Error connecting to notification hub: ' + err));
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection
        .stop()
        .then(() => console.log('Disconnected from notification hub'))
        .catch(err => console.log('Error disconnecting: ' + err));
    }
  }
}
