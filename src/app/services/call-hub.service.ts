import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { PhoneCall } from '../models/phoneCall';

@Injectable({
  providedIn: 'root'
})
export class CallHubService {
  private ngZone = inject(NgZone);

  private hubConnection?: signalR.HubConnection;
  private currentToken?: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000;

  readonly isConnected = signal<boolean>(false);

  // Subjects pour les événements du hub d'appels
  readonly callReceived$ = new Subject<PhoneCall>();
  readonly callUpdated$ = new Subject<PhoneCall>();
  readonly callEnded$ = new Subject<number>(); // id de l'appel terminé

  async startConnection(token: string): Promise<void> {
    this.currentToken = token;

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to call hub');
      this.isConnected.set(true);
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connecting) {
      console.log('Call hub connection in progress, waiting...');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/call`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 0, 1000, 3000, 5000, 10000])
      .withServerTimeout(30000)
      .build();

    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => {
        console.log('Reconnecting to call hub...');
        this.isConnected.set(false);
      });
    });

    this.hubConnection.onreconnected(async () => {
      this.ngZone.run(() => {
        console.log('Reconnected to call hub');
        this.isConnected.set(true);
        this.reconnectAttempts = 0;
      });
      // Rejoindre le groupe support après reconnexion automatique
      await this.joinSupportQueue();
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        console.log('Disconnected from call hub');
        this.isConnected.set(false);
      });
    });

    // Écouter les nouveaux appels entrants
    this.hubConnection.on('CallAdded', (call: PhoneCall) => {
      this.ngZone.run(() => {
        console.log('New call received:', call);
        this.callReceived$.next(call);
      });
    });

    // Écouter les mises à jour d'un appel (ex: user ajouté)
    this.hubConnection.on('CallUpdated', (call: PhoneCall) => {
      this.ngZone.run(() => {
        console.log('Call updated:', call);
        this.callUpdated$.next(call);
      });
    });

    // Écouter les fins d'appel
    this.hubConnection.on('CallRemoved', (callId: number) => {
      this.ngZone.run(() => {
        console.log('Call removed, id:', callId);
        this.callEnded$.next(callId);
      });
    });

    try {
      await this.hubConnection.start();
      this.ngZone.run(() => {
        console.log('Connected to call hub');
        this.isConnected.set(true);
        this.reconnectAttempts = 0;
      });
      // Rejoindre le groupe support pour recevoir les événements d'appels
      await this.joinSupportQueue();
    } catch (err) {
      this.ngZone.run(() => {
        console.error('Error connecting to call hub:', err);
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
            console.error('Call hub reconnection attempt failed:', err);
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
          console.log('Disconnected from call hub');
          this.isConnected.set(false);
        });
      } catch (err) {
        console.error('Error disconnecting from call hub:', err);
      }
    }
  }

  getConnectionState(): signalR.HubConnectionState | undefined {
    return this.hubConnection?.state;
  }

  isConnectionActive(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Rejoint le groupe SignalR "SupportQueue" afin de recevoir
   * les événements CallAdded / CallUpdated / CallRemoved.
   * Doit être appelé après chaque connexion ou reconnexion.
   */
  async joinSupportQueue(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('Cannot join SupportQueue: hub not connected');
      return;
    }
    try {
      await this.hubConnection.invoke('JoinSupportQueue');
      console.log('Joined SupportQueue group on call hub');
    } catch (err) {
      console.error('Error joining SupportQueue group:', err);
    }
  }
}
