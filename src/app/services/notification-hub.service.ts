import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationHubService {
  private hubConnection?: signalR.HubConnection;

  constructor(
    private ngZone: NgZone,
    private notificationService: NotificationService
  ) {}

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
