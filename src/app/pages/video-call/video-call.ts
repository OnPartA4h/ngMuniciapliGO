import {
  Component, OnInit, OnDestroy, AfterViewInit,
  inject, signal, ElementRef,
  viewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { VideoCallService } from '../../services/video-call.service';
import { ChatHubService } from '../../services/chat-hub.service';
import { ChatService } from '../../services/chat-service';
import { ChatType } from '../../models/chat';

import * as TwilioVideo from 'twilio-video';

/** Participant affiché dans l'UI (appel de groupe). */
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
export class VideoCall implements OnInit, OnDestroy, AfterViewInit {
  private videoCallService = inject(VideoCallService);
  private chatHub          = inject(ChatHubService);
  private chatService      = inject(ChatService);
  private subs: Subscription[] = [];

  readonly localVideoRef      = viewChild<ElementRef<HTMLVideoElement>>('localVideo');
  readonly localVideoPreview  = viewChild<ElementRef<HTMLVideoElement>>('localVideoPreview');
  readonly remoteVideosRef    = viewChild<ElementRef<HTMLDivElement>>('remoteVideos');

  // ── Paramètres reçus via l'URL ────────────────────────────────────────────
  chatId      = '';
  roomName    = '';
  twilioToken = '';
  isVideo     = true;
  isJoining   = false;

  // ── État UI ───────────────────────────────────────────────────────────────
  chatName              = signal('');
  isConnecting          = signal(true);
  isConnected           = signal(false);
  callDuration          = signal(0);
  isMuted               = signal(false);
  isVideoOff            = signal(false);
  hasCamera             = signal(true);
  error                 = signal('');
  callRejected          = signal(false);
  remoteJoined          = signal(false);
  isGroupCall           = false;
  connectedParticipants = signal<CallParticipant[]>([]);

  // ── Ressources (public for template access) ───────────────────────────────
  localStream: MediaStream | null = null;
  private twilioRoom?: TwilioVideo.Room;
  private durationInterval?: ReturnType<typeof setInterval>;
  private callerTimeoutTimer?: ReturnType<typeof setTimeout>;
  private cleanedUp = false;
  private viewReady = false;

  // ──────────────────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.bindLocalVideoToElement();
  }

  async ngOnInit(): Promise<void> {
    const params      = new URLSearchParams(window.location.search);
    this.chatId       = params.get('chatId')   ?? '';
    this.isVideo      = params.get('isVideo')  !== 'false';
    this.roomName     = params.get('roomName') ?? '';
    this.twilioToken  = params.get('token')    ?? '';
    this.isJoining    = params.get('joining')  === 'true';

    if (!this.chatId) {
      this.error.set('Missing chatId parameter');
      this.isConnecting.set(false);
      return;
    }

    try {
      const chat   = await this.chatService.getChat(this.chatId);
      const userId = localStorage.getItem('userId') ?? '';
      this.isGroupCall = chat.type === ChatType.Group;

      if (chat.name) {
        this.chatName.set(chat.name);
      } else {
        const other = chat.members.find(m => m.userId !== userId);
        this.chatName.set(other?.displayName ?? 'Call');
      }

      if (this.isGroupCall) {
        const self = chat.members.find(m => m.userId === userId);
        if (self) {
          this.connectedParticipants.set([{
            userId:            self.userId,
            displayName:       self.displayName + ' (vous)',
            profilePictureUrl: self.profilePictureUrl,
          }]);
        }
      }

      if (!this.isJoining && !this.twilioToken) {
        const resp       = await this.videoCallService.getCallToken(this.chatId, this.isVideo);
        this.twilioToken = resp.token;
        this.roomName    = resp.roomName;
      }

      // Always acquire both audio + video regardless of call type
      await this.acquireMediaStream();
      this.bindLocalVideoToElement();

      // Connect to Twilio room
      await this.connectTwilioRoom();

      // Caller timeout 45s
      if (!this.isJoining) {
        this.callerTimeoutTimer = setTimeout(() => {
          if (!this.remoteJoined()) this.hangUp();
        }, 45_000);
      }

      this.isConnecting.set(false);
      this.isConnected.set(true);

      // Re-bind local video after connecting state changes (different element)
      setTimeout(() => this.bindLocalVideoToElement(), 50);

      // SignalR subscriptions
      this.subs.push(
        this.chatHub.callEnded$.subscribe(ev => {
          const id = ev.ChatId ?? ev.chatId;
          if (id === this.chatId) this.onRemoteHangUp();
        }),
        this.chatHub.callRejected$.subscribe(ev => {
          const id = ev.ChatId ?? ev.chatId;
          if (id === this.chatId) this.onCallRejected();
        }),
      );

    } catch (err: any) {
      console.error('Failed to start call:', err);
      this.isConnecting.set(false);
      this.error.set(err?.message ?? 'Failed to start call');
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Bind local stream to whichever video element is currently in the DOM ──

  private bindLocalVideoToElement(): void {
    if (!this.localStream || !this.viewReady) return;

    // Try the main local-video PIP first
    const mainRef = this.localVideoRef();
    if (mainRef?.nativeElement) {
      mainRef.nativeElement.srcObject = this.localStream;
      return;
    }
    // Fall back to connecting-state preview
    const previewRef = this.localVideoPreview();
    if (previewRef?.nativeElement) {
      previewRef.nativeElement.srcObject = this.localStream;
    }
  }

  // ── SDK Twilio ─────────────────────────────────────────────────────────────

  private async connectTwilioRoom(): Promise<void> {
    if (!this.twilioToken || !this.roomName) {
      throw new Error('Missing Twilio token or roomName');
    }

    const tracks: (TwilioVideo.LocalAudioTrack | TwilioVideo.LocalVideoTrack)[] = [];
    if (this.localStream) {
      for (const t of this.localStream.getAudioTracks()) {
        tracks.push(new TwilioVideo.LocalAudioTrack(t));
      }
      // Publish video track if camera is on
      if (!this.isVideoOff()) {
        for (const t of this.localStream.getVideoTracks()) {
          tracks.push(new TwilioVideo.LocalVideoTrack(t));
        }
      }
    }

    this.twilioRoom = await TwilioVideo.connect(this.twilioToken, {
      name: this.roomName,
      tracks,
    });

    this.twilioRoom.participants.forEach(p => this.onParticipantConnected(p));

    this.twilioRoom.on('participantConnected', (p: TwilioVideo.RemoteParticipant) =>
      this.onParticipantConnected(p));

    this.twilioRoom.on('participantDisconnected', (p: TwilioVideo.RemoteParticipant) =>
      this.onParticipantDisconnected(p));

    this.twilioRoom.on('disconnected', (_room: TwilioVideo.Room, err?: TwilioVideo.TwilioError) => {
      if (err) {
        console.error('Twilio room disconnected unexpectedly:', err);
        this.error.set(err.message ?? 'Connection lost');
      }
      this.cleanup();
    });
  }

  private onParticipantConnected(participant: TwilioVideo.RemoteParticipant): void {
    participant.tracks.forEach(pub => {
      if (pub.isSubscribed && pub.track) {
        this.attachTrack(pub.track as TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack);
      }
    });

    participant.on('trackSubscribed', (track: TwilioVideo.RemoteTrack) =>
      this.attachTrack(track as TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack));

    participant.on('trackUnsubscribed', (track: TwilioVideo.RemoteTrack) =>
      this.detachTrack(track as TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack));

    if (!this.remoteJoined()) {
      this.remoteJoined.set(true);
      if (this.callerTimeoutTimer) {
        clearTimeout(this.callerTimeoutTimer);
        this.callerTimeoutTimer = undefined;
      }
      this.startDurationTimer();
    }
  }

  private onParticipantDisconnected(_p: TwilioVideo.RemoteParticipant): void {
    if (!this.isGroupCall && this.twilioRoom && this.twilioRoom.participants.size === 0) {
      this.onRemoteHangUp();
    }
  }

  private attachTrack(track: TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack): void {
    const remoteVideosRef = this.remoteVideosRef();
    if (!remoteVideosRef?.nativeElement) return;

    // Remove the placeholder if remote video is coming in
    const placeholder = remoteVideosRef.nativeElement.querySelector('.remote-placeholder');
    if (placeholder && track.kind === 'video') {
      placeholder.remove();
    }

    const el = track.attach();
    (el as HTMLElement).style.cssText = 'width:100%;height:100%;object-fit:cover;';
    remoteVideosRef.nativeElement.appendChild(el);
  }

  private detachTrack(track: TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack): void {
    track.detach().forEach(el => el.remove());
  }

  // ── Acquire local media ───────────────────────────────────────────────────

  /**
   * Always try to get both audio + video.
   * For audio calls, the camera starts disabled but the stream is still acquired
   * This lets the user enable camera during an audio call.
   */
  private async acquireMediaStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.hasCamera.set(true);

      // For "audio" calls, start with camera off but stream acquired
      if (!this.isVideo) {
        this.localStream.getVideoTracks().forEach(t => t.enabled = false);
        this.isVideoOff.set(true);
      } else {
        this.isVideoOff.set(false);
      }
    } catch {
      // Camera not available — fall back to audio only
      console.warn('Camera not available, joining with audio only');
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error('Microphone access denied or unavailable');
      }
      this.hasCamera.set(false);
      this.isVideoOff.set(true);
    }
  }

  // ── User actions ──────────────────────────────────────────────────────────

  async hangUp(): Promise<void> {
    try {
      await this.videoCallService.hangUp(this.chatId);
    } catch { /* server may have already ended */ }
    this.cleanup();
    window.close();
  }

  toggleMute(): void {
    this.isMuted.update(v => !v);
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted());
    }
    if (this.twilioRoom?.localParticipant) {
      this.twilioRoom.localParticipant.audioTracks.forEach(pub =>
        this.isMuted() ? pub.track.disable() : pub.track.enable());
    }
  }

  toggleVideo(): void {
    if (!this.hasCamera() && this.isVideoOff()) {
      this.addCameraTrack();
      return;
    }
    this.isVideoOff.update(v => !v);
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = !this.isVideoOff());
    }
    if (this.twilioRoom?.localParticipant) {
      this.twilioRoom.localParticipant.videoTracks.forEach(pub =>
        this.isVideoOff() ? pub.track.disable() : pub.track.enable());
    }
  }

  private async addCameraTrack(): Promise<void> {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const rawTrack    = videoStream.getVideoTracks()[0];

      if (this.localStream) {
        this.localStream.addTrack(rawTrack);
      } else {
        this.localStream = videoStream;
      }
      this.hasCamera.set(true);
      this.isVideoOff.set(false);

      this.bindLocalVideoToElement();

      if (this.twilioRoom?.localParticipant) {
        const localVideoTrack = new TwilioVideo.LocalVideoTrack(rawTrack);
        await this.twilioRoom.localParticipant.publishTrack(localVideoTrack);
      }
    } catch {
      console.warn('Cannot enable camera');
    }
  }

  // ── SignalR events ────────────────────────────────────────────────────────

  private onRemoteHangUp(): void {
    this.cleanup();
    this.error.set('Call ended');
  }

  private onCallRejected(): void {
    this.callRejected.set(true);
    this.cleanup();
  }

  // ── Duration timer ────────────────────────────────────────────────────────

  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => this.callDuration.update(d => d + 1), 1000);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;

    if (this.callerTimeoutTimer) {
      clearTimeout(this.callerTimeoutTimer);
      this.callerTimeoutTimer = undefined;
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = undefined;
    }

    if (this.twilioRoom) {
      this.twilioRoom.localParticipant?.tracks.forEach(pub => {
        const track = pub.track as TwilioVideo.LocalAudioTrack | TwilioVideo.LocalVideoTrack | TwilioVideo.LocalDataTrack;
        if (track.kind === 'audio' || track.kind === 'video') {
          (track as TwilioVideo.LocalAudioTrack | TwilioVideo.LocalVideoTrack).stop();
        }
        this.twilioRoom!.localParticipant.unpublishTrack(
          track as TwilioVideo.LocalAudioTrack | TwilioVideo.LocalVideoTrack,
        );
      });
      this.twilioRoom.disconnect();
      this.twilioRoom = undefined;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.isConnected.set(false);
  }

  // ── UI Helpers ────────────────────────────────────────────────────────────

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
}