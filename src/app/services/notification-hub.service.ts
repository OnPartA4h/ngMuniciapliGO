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
  private currentToken?: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  
  // Signal for AI processing count
  readonly duplicateProcessingCount = signal<number>(0);
  readonly isConnected = signal<boolean>(false);

  async startConnection(token: string): Promise<void> {
    // Store token for potential reconnection
    this.currentToken = token;

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to notification hub');
      this.isConnected.set(true);
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connecting) {
      console.log('Connection in progress, waiting...');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notification`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 0, 1000, 3000, 5000, 10000])
      .withServerTimeout(30000)
      .build();

    // Handle reconnection events
    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => {
        console.log('Reconnecting to notification hub...');
        this.isConnected.set(false);
      });
    });

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => {
        console.log('Reconnected to notification hub');
        this.isConnected.set(true);
        this.reconnectAttempts = 0;
      });
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        console.log('Disconnected from notification hub');
        this.isConnected.set(false);
      });
    });

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
        this.duplicateProcessingCount.set(count);
      });
    });

    try {
      await this.hubConnection.start();
      this.ngZone.run(() => {
        console.log('Connected to notification hub');
        this.isConnected.set(true);
        this.reconnectAttempts = 0;
      });
    } catch (err) {
      this.ngZone.run(() => {
        console.error('Error connecting to notification hub:', err);
        this.isConnected.set(false);
        this.handleConnectionError();
      });
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentToken) {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      
      setTimeout(() => {
        if (this.currentToken) {
          this.startConnection(this.currentToken).catch(err => {
            console.error('Reconnection attempt failed:', err);
          });
        }
      }, this.reconnectDelay);
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.ngZone.run(() => {
          console.log('Disconnected from notification hub');
          this.isConnected.set(false);
        });
      } catch (err) {
        console.error('Error disconnecting from notification hub:', err);
      }
    }
  }

  getConnectionState(): signalR.HubConnectionState | undefined {
    return this.hubConnection?.state;
  }

  isConnectionActive(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}
