import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import {
  ChatDto, ChatMemberDto, ChatMessageDto,
  IncomingCallEvent, CallEndedEvent, CallRejectedEvent
} from '../models/chat';

export interface ReadReceiptEvent {
  chatId: string;
  userId: string;
  messageId: string;
}

export interface MemberRemovedEvent {
  chatId: string;
  userId: string;
}

export interface MemberAddedEvent {
  chatId: string;
  member: ChatMemberDto;
}

export interface GroupRenamedEvent {
  chatId: string;
  newName: string;
}

export interface MessageDeletedEvent {
  chatId: string;
  messageId: string;
}

export interface TypingEvent {
  chatId: string;
  userId: string;
}

export interface UserPresenceEvent {
  chatId: string;
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatHubService {
  private ngZone = inject(NgZone);

  private hubConnection?: signalR.HubConnection;
  private currentToken?: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 3000;

  readonly isConnected = signal<boolean>(false);

  // ── Presence tracking: per-chat set of online user IDs ────────────────
  // Key = chatId, Value = set of online userIds in that chat
  private readonly chatOnlineUsers = new Map<string, Set<string>>();

  // Global set of online users (union of all chats) — kept for backwards compat
  readonly onlineUsers = signal<Set<string>>(new Set());

  // ── Subjects observables (multi-abonnement) ───────────────────────────────

  readonly newMessage$        = new Subject<ChatMessageDto>();
  readonly messageEdited$     = new Subject<ChatMessageDto>();
  readonly messageDeleted$    = new Subject<MessageDeletedEvent>();
  readonly readReceipt$       = new Subject<ReadReceiptEvent>();
  readonly reactionToggled$   = new Subject<ChatMessageDto>();

  readonly memberAdded$       = new Subject<MemberAddedEvent>();
  readonly memberRemoved$     = new Subject<MemberRemovedEvent>();
  readonly addedToChat$       = new Subject<ChatDto>();
  readonly removedFromChat$   = new Subject<{ chatId: string }>();
  readonly groupRenamed$      = new Subject<GroupRenamedEvent>();

  readonly typingStart$       = new Subject<TypingEvent>();
  readonly typingStop$        = new Subject<TypingEvent>();
  readonly userOnline$        = new Subject<UserPresenceEvent>();
  readonly userOffline$       = new Subject<UserPresenceEvent>();

  // ── Call Subjects ──────────────────────────────────────────────────────
  readonly incomingCall$      = new Subject<IncomingCallEvent>();
  readonly callEnded$         = new Subject<CallEndedEvent>();
  readonly callRejected$      = new Subject<CallRejectedEvent>();

  // ── Connexion ─────────────────────────────────────────────────────────────

  async startConnection(token: string): Promise<void> {
    this.currentToken = token;

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to chat hub');
      this.isConnected.set(true);
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connecting) {
      console.log('Chat hub connection in progress, waiting...');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/chat`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 0, 1000, 3000, 5000, 10000])
      .withServerTimeout(30000)
      .build();

    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => {
        console.log('Reconnecting to chat hub...');
        this.isConnected.set(false);
      });
    });

    this.hubConnection.onreconnected(async () => {
      this.ngZone.run(() => {
        console.log('Reconnected to chat hub');
        this.isConnected.set(true);
        this.reconnectAttempts = 0;
        // Per protocol: clear ALL presence cache on reconnect.
        // The server will re-send ChatOnlineUsers snapshots for each chat.
        this.chatOnlineUsers.clear();
        this.onlineUsers.set(new Set());
      });
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        console.log('Disconnected from chat hub');
        this.isConnected.set(false);
      });
    });

    this.registerHandlers();

    try {
      await this.hubConnection.start();
      this.ngZone.run(() => {
        console.log('Connected to chat hub');
        this.isConnected.set(true);
        this.reconnectAttempts = 0;
        // The server automatically sends ChatOnlineUsers snapshots on connect
      });
    } catch (err) {
      this.ngZone.run(() => {
        console.error('Error connecting to chat hub:', err);
        this.isConnected.set(false);
        this.handleConnectionError();
      });
    }
  }

  // ── Méthodes invocables côté client ──────────────────────────────────────

  async joinChat(chatId: string): Promise<void> {
    await this.invoke('JoinChat', chatId);
  }

  async leaveChat(chatId: string): Promise<void> {
    await this.invoke('LeaveChat', chatId);
  }

  async typingStart(chatId: string): Promise<void> {
    await this.invoke('TypingStart', chatId);
  }

  async typingStop(chatId: string): Promise<void> {
    await this.invoke('TypingStop', chatId);
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.ngZone.run(() => {
          console.log('Disconnected from chat hub');
          this.isConnected.set(false);
        });
      } catch (err) {
        console.error('Error disconnecting from chat hub:', err);
      }
    }
  }

  getConnectionState(): signalR.HubConnectionState | undefined {
    return this.hubConnection?.state;
  }

  isConnectionActive(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers().has(userId);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('NewMessage', (msg: ChatMessageDto) =>
      this.ngZone.run(() => this.newMessage$.next(msg)));

    this.hubConnection.on('MessageEdited', (msg: ChatMessageDto) =>
      this.ngZone.run(() => this.messageEdited$.next(msg)));

    this.hubConnection.on('MessageDeleted', (event: MessageDeletedEvent) =>
      this.ngZone.run(() => this.messageDeleted$.next(event)));

    this.hubConnection.on('ReadReceipt', (event: ReadReceiptEvent) =>
      this.ngZone.run(() => this.readReceipt$.next(event)));

    this.hubConnection.on('ReactionToggled', (msg: ChatMessageDto) =>
      this.ngZone.run(() => this.reactionToggled$.next(msg)));

    this.hubConnection.on('MemberAdded', (event: MemberAddedEvent) =>
      this.ngZone.run(() => this.memberAdded$.next(event)));

    this.hubConnection.on('MemberRemoved', (event: MemberRemovedEvent) =>
      this.ngZone.run(() => this.memberRemoved$.next(event)));

    this.hubConnection.on('AddedToChat', (chat: ChatDto) =>
      this.ngZone.run(() => this.addedToChat$.next(chat)));

    this.hubConnection.on('RemovedFromChat', (event: { chatId: string }) =>
      this.ngZone.run(() => this.removedFromChat$.next(event)));

    this.hubConnection.on('GroupRenamed', (event: GroupRenamedEvent) =>
      this.ngZone.run(() => this.groupRenamed$.next(event)));

    this.hubConnection.on('TypingStart', (event: TypingEvent) =>
      this.ngZone.run(() => this.typingStart$.next(event)));

    this.hubConnection.on('TypingStop', (event: TypingEvent) =>
      this.ngZone.run(() => this.typingStop$.next(event)));

    this.hubConnection.on('UserOnline', (raw: any) =>
      this.ngZone.run(() => {
        const event: UserPresenceEvent = {
          userId: raw.UserId ?? raw.userId,
          chatId: raw.ChatId ?? raw.chatId,
        };
        this.onlineUsers.update(set => { const s = new Set(set); s.add(event.userId); return s; });
        if (event.chatId) {
          const chatSet = this.chatOnlineUsers.get(event.chatId) ?? new Set<string>();
          chatSet.add(event.userId);
          this.chatOnlineUsers.set(event.chatId, chatSet);
        }
        this.userOnline$.next(event);
      }));

    this.hubConnection.on('UserOffline', (raw: any) =>
      this.ngZone.run(() => {
        const event: UserPresenceEvent = {
          userId: raw.UserId ?? raw.userId,
          chatId: raw.ChatId ?? raw.chatId,
        };
        this.onlineUsers.update(set => { const s = new Set(set); s.delete(event.userId); return s; });
        if (event.chatId) {
          this.chatOnlineUsers.get(event.chatId)?.delete(event.userId);
        }
        this.userOffline$.next(event);
      }));

    // ── Presence snapshot: server sends this once per chat on connect/reconnect ──
    // Per protocol: REPLACE (not merge) the presence for that specific chat.
    this.hubConnection.on('ChatOnlineUsers', (raw: any) =>
      this.ngZone.run(() => {
        const chatId: string = raw.ChatId ?? raw.chatId;
        const userIds: string[] = raw.UserIds ?? raw.userIds ?? [];
        // Replace the per-chat set entirely (authoritative snapshot)
        const newSet = new Set<string>(userIds);
        this.chatOnlineUsers.set(chatId, newSet);
        // Rebuild global online set from all chats
        const merged = new Set<string>();
        this.chatOnlineUsers.forEach(s => s.forEach(id => merged.add(id)));
        this.onlineUsers.set(merged);
      }));

    // ── Call handlers — normalize PascalCase keys from server ───────────
    this.hubConnection.on('IncomingCall', (raw: any) =>
      this.ngZone.run(() => {
        const event: IncomingCallEvent = {
          ChatId:     raw.ChatId     ?? raw.chatId,
          CallerId:   raw.CallerId   ?? raw.callerId,
          CallerName: raw.CallerName ?? raw.callerName,
          IsVideo:    raw.IsVideo    ?? raw.isVideo,
          RoomName:   raw.RoomName   ?? raw.roomName,
          // camelCase aliases
          chatId:     raw.ChatId     ?? raw.chatId,
          callerId:   raw.CallerId   ?? raw.callerId,
          callerName: raw.CallerName ?? raw.callerName,
          isVideo:    raw.IsVideo    ?? raw.isVideo,
          roomName:   raw.RoomName   ?? raw.roomName,
        };
        this.incomingCall$.next(event);
      }));

    this.hubConnection.on('CallEnded', (raw: any) =>
      this.ngZone.run(() => {
        const event: CallEndedEvent = {
          ChatId: raw.ChatId ?? raw.chatId,
          chatId: raw.ChatId ?? raw.chatId,
        };
        this.callEnded$.next(event);
      }));

    this.hubConnection.on('CallRejected', (raw: any) =>
      this.ngZone.run(() => {
        const event: CallRejectedEvent = {
          ChatId: raw.ChatId ?? raw.chatId,
          chatId: raw.ChatId ?? raw.chatId,
        };
        this.callRejected$.next(event);
      }));
  }

  private async invoke(method: string, ...args: any[]): Promise<void> {
    if (!this.isConnectionActive()) {
      console.warn(`ChatHub: cannot invoke '${method}', not connected.`);
      return;
    }
    try {
      await this.hubConnection!.invoke(method, ...args);
    } catch (err) {
      console.error(`ChatHub: error invoking '${method}':`, err);
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentToken) {
      this.reconnectAttempts++;
      console.log(`Chat hub reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      setTimeout(() => {
        if (this.currentToken) {
          this.startConnection(this.currentToken).catch(err =>
            console.error('Chat hub reconnection attempt failed:', err));
        }
      }, this.reconnectDelay);
    }
  }
}
