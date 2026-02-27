import {
  Component, OnInit, OnDestroy,
  inject, signal, ElementRef, ViewChild,
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
export class VideoCall implements OnInit, OnDestroy {
  private videoCallService = inject(VideoCallService);
  private chatHub          = inject(ChatHubService);
  private chatService      = inject(ChatService);
  private subs: Subscription[] = [];

  @ViewChild('localVideo')   localVideoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideos') remoteVideosRef!: ElementRef<HTMLDivElement>;

  // ── Paramètres reçus via l'URL ────────────────────────────────────────────
  chatId      = '';
  roomName    = '';   // UUID stable de l'appel
  twilioToken = '';   // JWT Twilio court-terme
  isVideo     = true;
  isJoining   = false; // true = callee, false = caller

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
  /** True dès qu'au moins un participant distant a rejoint la room. */
  remoteJoined          = signal(false);
  isGroupCall           = false;
  connectedParticipants = signal<CallParticipant[]>([]);

  // ── Ressources ────────────────────────────────────────────────────────────
  private twilioRoom?: TwilioVideo.Room;
  private localStream: MediaStream | null = null;
  private durationInterval?: ReturnType<typeof setInterval>;
  /** Timer caller 45 s sans réponse → raccrocher (§6.7). */
  private callerTimeoutTimer?: ReturnType<typeof setTimeout>;
  private cleanedUp = false;

  // ──────────────────────────────────────────────────────────────────────────

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
      // Chargement des infos du chat pour l'affichage
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

      // ── CALLER (§6.1) : token passé dans l'URL par chat-detail.startCall() ──
      // Si le token est absent (cas de secours), on le redemande.
      if (!this.isJoining && !this.twilioToken) {
        const resp       = await this.videoCallService.getCallToken(this.chatId, this.isVideo);
        this.twilioToken = resp.token;
        this.roomName    = resp.roomName;
      }

      // ── CALLEE (§6.2) : token déjà obtenu dans incoming-call.accept() ────────
      // roomName et token sont dans l'URL.

      // Acquisition du flux local (audio ± vidéo)
      await this.acquireMediaStream();
      if (this.localVideoRef?.nativeElement && this.localStream) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      // Connexion à la room Twilio
      await this.connectTwilioRoom();

      // Timer côté caller (§6.7)
      if (!this.isJoining) {
        this.callerTimeoutTimer = setTimeout(() => {
          if (!this.remoteJoined()) this.hangUp();
        }, 45_000);
      }

      this.isConnecting.set(false);
      this.isConnected.set(true);

      // Abonnements SignalR
      this.subs.push(
        // §6.5 — l'autre côté raccroche
        this.chatHub.callEnded$.subscribe(ev => {
          const id = ev.ChatId ?? ev.chatId;
          if (id === this.chatId) this.onRemoteHangUp();
        }),
        // §6.6 — le callee refuse (uniquement pertinent pour le caller)
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

  // ── SDK Twilio ─────────────────────────────────────────────────────────────

  /** Connexion à la room Twilio (§6.1 caller / §6.2 callee). */
  private async connectTwilioRoom(): Promise<void> {
    if (!this.twilioToken || !this.roomName) {
      throw new Error('Missing Twilio token or roomName');
    }

    const tracks: (TwilioVideo.LocalAudioTrack | TwilioVideo.LocalVideoTrack)[] = [];
    if (this.localStream) {
      for (const t of this.localStream.getAudioTracks()) {
        tracks.push(new TwilioVideo.LocalAudioTrack(t));
      }
      if (this.isVideo && !this.isVideoOff()) {
        for (const t of this.localStream.getVideoTracks()) {
          tracks.push(new TwilioVideo.LocalVideoTrack(t));
        }
      }
    }

    this.twilioRoom = await TwilioVideo.connect(this.twilioToken, {
      name: this.roomName,
      tracks,
    });

    // Participants déjà présents dans la room (callee rejoint une room avec le caller)
    this.twilioRoom.participants.forEach(p => this.onParticipantConnected(p));

    this.twilioRoom.on('participantConnected', (p: TwilioVideo.RemoteParticipant) =>
      this.onParticipantConnected(p));

    this.twilioRoom.on('participantDisconnected', (p: TwilioVideo.RemoteParticipant) =>
      this.onParticipantDisconnected(p));

    // Déconnexion inattendue de la room
    this.twilioRoom.on('disconnected', (_room: TwilioVideo.Room, err?: TwilioVideo.TwilioError) => {
      if (err) {
        console.error('Twilio room disconnected unexpectedly:', err);
        this.error.set(err.message ?? 'Connection lost');
      }
      this.cleanup();
    });
  }

  private onParticipantConnected(participant: TwilioVideo.RemoteParticipant): void {
    // Attacher les pistes déjà souscrites
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
    // Appel 1-à-1 : si plus aucun participant distant → fin d'appel
    if (!this.isGroupCall && this.twilioRoom && this.twilioRoom.participants.size === 0) {
      this.onRemoteHangUp();
    }
  }

  private attachTrack(track: TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack): void {
    if (!this.remoteVideosRef?.nativeElement) return;
    const el = track.attach();
    (el as HTMLElement).style.cssText = 'width:100%;height:100%;object-fit:cover;';
    this.remoteVideosRef.nativeElement.appendChild(el);
  }

  private detachTrack(track: TwilioVideo.RemoteAudioTrack | TwilioVideo.RemoteVideoTrack): void {
    track.detach().forEach(el => el.remove());
  }

  // ── Flux local ────────────────────────────────────────────────────────────

  private async acquireMediaStream(): Promise<void> {
    if (this.isVideo) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.hasCamera.set(true);
        this.isVideoOff.set(false);
      } catch {
        console.warn('Camera not available, joining with audio only');
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          throw new Error('Microphone access denied or unavailable');
        }
        this.hasCamera.set(false);
        this.isVideoOff.set(true);
      }
    } else {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error('Microphone access denied or unavailable');
      }
      this.hasCamera.set(false);
      this.isVideoOff.set(true);
    }
  }

  // ── Actions utilisateur ───────────────────────────────────────────────────

  /**
   * Raccrocher (§6.4).
   * Ordre : 1. POST /hangup  2. Déconnecter Twilio  3. Fermer l'UI.
   */
  async hangUp(): Promise<void> {
    try {
      await this.videoCallService.hangUp(this.chatId);
    } catch { /* le serveur a peut-être déjà terminé l'appel */ }
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

      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      // Publier la nouvelle piste vidéo dans la room Twilio
      if (this.twilioRoom?.localParticipant) {
        const localVideoTrack = new TwilioVideo.LocalVideoTrack(rawTrack);
        await this.twilioRoom.localParticipant.publishTrack(localVideoTrack);
      }
    } catch {
      console.warn('Cannot enable camera');
    }
  }

  // ── Événements SignalR ────────────────────────────────────────────────────

  /** §6.5 — l'autre côté raccroche. */
  private onRemoteHangUp(): void {
    this.cleanup();
    this.error.set('Call ended');
  }

  /** §6.6 — le callee refuse (vu par le caller). */
  private onCallRejected(): void {
    this.callRejected.set(true);
    this.cleanup();
  }

  // ── Timer durée ───────────────────────────────────────────────────────────

  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => this.callDuration.update(d => d + 1), 1000);
  }

  // ── Nettoyage des ressources (§9) ─────────────────────────────────────────

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

    // Déconnecter la room Twilio et dépublier les pistes locales
    if (this.twilioRoom) {
      this.twilioRoom.localParticipant?.tracks.forEach(pub => {
        // LocalDataTrack n'a pas de méthode stop() — on ne dépublie que audio/video
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

    // Libérer caméra et microphone
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.isConnected.set(false);
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

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