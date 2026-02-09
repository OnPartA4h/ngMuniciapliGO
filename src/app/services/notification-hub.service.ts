import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationHubService {
  private hubConnection: signalR.HubConnection | null = null;
  private connectionState = new BehaviorSubject<signalR.HubConnectionState>(signalR.HubConnectionState.Disconnected);
  private notificationReceived = new BehaviorSubject<Notification | null>(null);

  public connectionState$ = this.connectionState.asObservable();
  public notificationReceived$ = this.notificationReceived.asObservable();

  constructor(
    private ngZone: NgZone,
    private notificationService: NotificationService
  ) {}

  async startConnection(token: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to notification hub');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notification`, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Stratégie de reconnexion progressive
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.random() * 10000; // 0-10 secondes
          } else {
            return 30000; // 30 secondes
          }
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Gérer les événements de connexion
    this.hubConnection.onclose((error) => {
      console.log('Notification hub connection closed', error);
      this.ngZone.run(() => {
        this.connectionState.next(signalR.HubConnectionState.Disconnected);
      });
    });

    this.hubConnection.onreconnecting((error) => {
      console.log('Notification hub reconnecting...', error);
      this.ngZone.run(() => {
        this.connectionState.next(signalR.HubConnectionState.Reconnecting);
      });
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('Notification hub reconnected', connectionId);
      this.ngZone.run(() => {
        this.connectionState.next(signalR.HubConnectionState.Connected);
      });
    });

    // Écouter les notifications entrantes
    this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
      console.log('New notification received:', notification);
      this.ngZone.run(() => {
        this.notificationReceived.next(notification);
        this.notificationService.incrementUnreadCount();
      });
    });

    try {
      await this.hubConnection.start();
      console.log('Connected to notification hub');
      this.ngZone.run(() => {
        this.connectionState.next(signalR.HubConnectionState.Connected);
      });
    } catch (error) {
      console.error('Error connecting to notification hub:', error);
      throw error;
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        console.log('Disconnected from notification hub');
        this.ngZone.run(() => {
          this.connectionState.next(signalR.HubConnectionState.Disconnected);
        });
      } catch (error) {
        console.error('Error disconnecting from notification hub:', error);
      }
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  getConnectionState(): signalR.HubConnectionState {
    return this.hubConnection?.state ?? signalR.HubConnectionState.Disconnected;
  }
}
