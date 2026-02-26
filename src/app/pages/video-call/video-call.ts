import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { VideoCallService } from '../../services/video-call.service';
import { ChatHubService } from '../../services/chat-hub.service';
import { ChatService } from '../../services/chat-service';

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
  chatName = signal('');
  isConnecting = signal(true);
  isConnected = signal(false);
  callDuration = signal(0);
  isMuted = signal(false);
  isVideoOff = signal(false);
  error = signal('');

  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private durationInterval?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    this.chatId = params.get('chatId') ?? '';
    this.isVideo = params.get('isVideo') !== 'false';

    if (!this.chatId) {
      this.error.set('Missing chatId parameter');
      return;
    }

    try {
      // Load chat name
      const chat = await this.chatService.getChat(this.chatId);
      const userId = localStorage.getItem('userId') ?? '';
      if (chat.name) {
        this.chatName.set(chat.name);
      } else {
        const other = chat.members.find(m => m.userId !== userId);
        this.chatName.set(other?.displayName ?? 'Call');
      }

      // Get media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: this.isVideo,
        audio: true,
      });

      if (this.localVideoRef?.nativeElement && this.localStream) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      // Get Twilio token (we use this to signal the backend, even without Twilio JS SDK)
      await this.videoCallService.getCallToken(this.chatId, this.isVideo);

      this.isConnecting.set(false);
      this.isConnected.set(true);
      this.startDurationTimer();

      // Listen for call ended
      this.subs.push(
        this.chatHub.callEnded$.subscribe(event => {
          if (event.chatId === this.chatId) {
            this.hangUp();
          }
        })
      );
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

  async hangUp(): Promise<void> {
    try {
      await this.videoCallService.hangUp(this.chatId);
    } catch { /* ignore */ }
    this.cleanup();
    window.close();
  }

  toggleMute(): void {
    this.isMuted.update(v => !v);
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted());
    }
  }

  toggleVideo(): void {
    this.isVideoOff.update(v => !v);
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = !this.isVideoOff());
    }
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      this.callDuration.update(d => d + 1);
    }, 1000);
  }

  private cleanup(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.isConnected.set(false);
  }
}
