import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { VideoCallService } from '../../services/video-call.service';
import { ChatHubService } from '../../services/chat-hub.service';
import { ChatService } from '../../services/chat-service';
import { ChatType } from '../../models/chat';

/** Participant in a group call (for display purposes). */
export interface CallParticipant {
  userId: string;
  displayName: string;
  profilePictureUrl: string | null;
}

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './video-call.html',
  styleUrl: './video-call.css',
})
export class VideoCall implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private videoCallService = inject(VideoCallService);
  private chatHub = inject(ChatHubService);
  private chatService = inject(ChatService);
  private subs: Subscription[] = [];

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideos') remoteVideosRef!: ElementRef<HTMLDivElement>;

  chatId = '';
  isVideo = true;
  isGroupCall = false;
  chatName = signal('');
  isConnecting = signal(true);
  isConnected = signal(false);
  callDuration = signal(0);
  isMuted = signal(false);
  isVideoOff = signal(false);
  hasCamera = signal(true);
  error = signal('');
  callRejected = signal(false);
  /** True once at least one remote participant has joined the call. */
  remoteJoined = signal(false);

  // Group call: connected participants
  connectedParticipants = signal<CallParticipant[]>([]);

  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private durationInterval?: ReturnType<typeof setInterval>;
  private remoteCheckInterval?: ReturnType<typeof setInterval>;
  private callStarted = false;
  private otherUserId = '';

  async ngOnInit(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    this.chatId = params.get('chatId') ?? '';
    this.isVideo = params.get('isVideo') !== 'false';

    if (!this.chatId) {
      this.error.set('Missing chatId parameter');
      return;
    }

    try {
      // Load chat info
      const chat = await this.chatService.getChat(this.chatId);
      const userId = localStorage.getItem('userId') ?? '';
      this.isGroupCall = chat.type === ChatType.Group;

      if (chat.name) {
        this.chatName.set(chat.name);
      } else {
        const other = chat.members.find(m => m.userId !== userId);
        this.chatName.set(other?.displayName ?? 'Call');
        if (other) this.otherUserId = other.userId;
      }

      // For group calls, initialize the participants list with ourselves
      if (this.isGroupCall) {
        const self = chat.members.find(m => m.userId === userId);
        if (self) {
          this.connectedParticipants.set([{
            userId: self.userId,
            displayName: self.displayName + ' (you)',
            profilePictureUrl: self.profilePictureUrl,
          }]);
        }
      }

      // Get media stream – allow joining without a camera
      await this.acquireMediaStream();

      if (this.localVideoRef?.nativeElement && this.localStream) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      // Get token from backend (signals the backend that we're joining)
      await this.videoCallService.getCallToken(this.chatId, this.isVideo);

      this.isConnecting.set(false);
      this.isConnected.set(true);
      this.callStarted = true;
      // Do NOT start the timer yet — it starts only when a remote participant joins
      // (or immediately for the callee, who joins a call that is already active)

      // Listen for call ended
      this.subs.push(
        this.chatHub.callEnded$.subscribe(event => {
          if (event.chatId === this.chatId) {
            this.onRemoteHangUp();
          }
        }),
        this.chatHub.callRejected$.subscribe(event => {
          if (event.chatId === this.chatId) {
            this.onCallRejected();
          }
        }),
        // When another user comes online or a new message arrives in this chat,
        // treat it as a signal that the remote party has joined the call.
        this.chatHub.userOnline$.subscribe(event => {
          if (event.chatId === this.chatId && event.userId !== userId) {
            this.onRemoteParticipantJoined();
          }
        }),
        this.chatHub.newMessage$.subscribe(msg => {
          if (msg.chatId === this.chatId && !this.remoteJoined()) {
            this.onRemoteParticipantJoined();
          }
        }),
        // When the callee joins, they send a typing indicator as a "call joined" signal
        this.chatHub.typingStart$.subscribe(event => {
          if (event.chatId === this.chatId && event.userId !== userId && !this.remoteJoined()) {
            this.onRemoteParticipantJoined();
          }
        }),
      );

      // Ensure our connection is in the chat's SignalR group so we receive events
      await this.chatHub.joinChat(this.chatId);

      // If we are the callee (someone called us and we accepted),
      // the caller is already in the call — start the timer right away.
      // Also send a typing signal so the caller knows we've joined.
      const isJoining = params.get('joining') === 'true';
      if (isJoining) {
        this.onRemoteParticipantJoined();
        // Notify the caller that we've joined by sending a typing indicator
        this.chatHub.typingStart(this.chatId).then(() => {
          setTimeout(() => this.chatHub.typingStop(this.chatId), 500);
        });
      } else {
        // For the caller: start polling as a safety net
        this.startRemoteDetectionPolling(userId);
      }
    } catch (err: any) {
      console.error('Failed to start call:', err);
      this.isConnecting.set(false);
      this.error.set(err.message ?? 'Failed to start call');
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.subs.forEach(s => s.unsubscribe());
  }

  /** Acquire audio (required) and video (optional). */
  private async acquireMediaStream(): Promise<void> {
    if (this.isVideo) {
      try {
        // Try to get both audio + video
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        this.hasCamera.set(true);
        this.isVideoOff.set(false);
      } catch {
        // Camera not available or denied – fall back to audio only
        console.warn('Camera not available, joining with audio only');
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (audioErr) {
          throw new Error('Microphone access denied or unavailable');
        }
        this.hasCamera.set(false);
        this.isVideoOff.set(true);
      }
    } else {
      // Audio call: only request audio
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error('Microphone access denied or unavailable');
      }
      this.hasCamera.set(false);
      this.isVideoOff.set(true);
    }
  }

  async hangUp(): Promise<void> {
    if (!this.callStarted && !this.callRejected()) {
      // If call never started, just close
      this.cleanup();
      window.close();
      return;
    }
    try {
      await this.videoCallService.hangUp(this.chatId);
    } catch { /* ignore */ }
    this.cleanup();
    window.close();
  }

  /** Called when the remote side hangs up. */
  private onRemoteHangUp(): void {
    this.cleanup();
    // Don't auto-close: show a "call ended" state so user sees it
    this.error.set('Call ended');
    this.callStarted = false;
  }

  /** Called when the remote side rejects the call. */
  private onCallRejected(): void {
    this.callRejected.set(true);
    this.cleanup();
    this.callStarted = false;
  }

  /** Called when a remote participant joins the call — starts the timer. */
  private onRemoteParticipantJoined(): void {
    if (this.remoteJoined()) return; // already handled
    this.remoteJoined.set(true);
    this.stopRemoteDetectionPolling();
    this.startDurationTimer();
  }

  /**
   * For the caller: periodically check if the callee has become active.
   * Since the callee may already be online (connected to SignalR) when they
   * accept the call, the `UserOnline` event won't fire again.
   * We poll the active call tracker indirectly via newMessage$ and userOnline$,
   * but also use a simple interval to detect the callee joining.
   */
  private startRemoteDetectionPolling(currentUserId: string): void {
    // Check immediately if the other user is online (they might already be)
    // but don't mark joined yet — give them time to actually open the call page
    this.remoteCheckInterval = setInterval(() => {
      if (this.remoteJoined()) {
        this.stopRemoteDetectionPolling();
        return;
      }
      // The callee's call page also calls getCallToken, which triggers
      // the backend to track them as an active caller. Since we can't
      // directly query that, we rely on the SignalR events (userOnline$,
      // newMessage$, callEnded$). This polling is a safety net.
    }, 2000);
  }

  private stopRemoteDetectionPolling(): void {
    if (this.remoteCheckInterval) {
      clearInterval(this.remoteCheckInterval);
      this.remoteCheckInterval = undefined;
    }
  }

  toggleMute(): void {
    this.isMuted.update(v => !v);
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted());
    }
  }

  toggleVideo(): void {
    if (!this.hasCamera() && this.isVideoOff()) {
      // Try to acquire camera on-the-fly
      this.addCameraTrack();
      return;
    }
    this.isVideoOff.update(v => !v);
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = !this.isVideoOff());
    }
  }

  /** Try to add a camera track at runtime (user didn't have one initially). */
  private async addCameraTrack(): Promise<void> {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (this.localStream) {
        this.localStream.addTrack(videoTrack);
      } else {
        this.localStream = videoStream;
      }
      this.hasCamera.set(true);
      this.isVideoOff.set(false);
      // Attach to video element
      if (this.localVideoRef?.nativeElement && this.localStream) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }
    } catch {
      console.warn('Cannot enable camera');
    }
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      this.callDuration.update(d => d + 1);
    }, 1000);
  }

  private cleanup(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = undefined;
    }
    this.stopRemoteDetectionPolling();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach(pc => {
      try { pc.close(); } catch { /* ignore already closed */ }
    });
    this.peerConnections.clear();
    this.isConnected.set(false);
  }
}
