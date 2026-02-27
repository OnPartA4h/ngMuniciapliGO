import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ChatHubService } from '../../services/chat-hub.service';
import { VideoCallService } from '../../services/video-call.service';
import { IncomingCallEvent } from '../../models/chat';

@Component({
  selector: 'app-incoming-call',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './incoming-call.html',
  styleUrl: './incoming-call.css',
})
export class IncomingCallComponent implements OnInit, OnDestroy {
  private chatHub = inject(ChatHubService);
  private videoCallService = inject(VideoCallService);
  private subs: Subscription[] = [];

  incomingCall = signal<IncomingCallEvent | null>(null);
  private autoRejectTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.subs.push(
      this.chatHub.incomingCall$.subscribe(event => {
        const current = this.incomingCall();
        // Deduplication: ignore if same RoomName is already being displayed
        if (current && current.RoomName === event.RoomName) return;
        // If another call is active, dismiss it first (one active call at a time)
        if (current) this.dismiss();

        this.incomingCall.set(event);
        this.playRingtone();
        // Auto-reject after 45 seconds per protocol
        this.clearAutoRejectTimer();
        this.autoRejectTimer = setTimeout(() => {
          if (this.incomingCall()) this.reject();
        }, 45000);
      }),
      // Caller hung up before we answered
      this.chatHub.callEnded$.subscribe(event => {
        const chatId = event.ChatId ?? event.chatId;
        if (this.incomingCall()?.ChatId === chatId) this.dismiss();
      }),
      // Call was rejected elsewhere (e.g. another device)
      this.chatHub.callRejected$.subscribe(event => {
        const chatId = event.ChatId ?? event.chatId;
        if (this.incomingCall()?.ChatId === chatId) this.dismiss();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.clearAutoRejectTimer();
    this.stopRingtone();
  }

  async accept(): Promise<void> {
    const call = this.incomingCall();
    if (!call) return;
    this.stopRingtone();
    this.clearAutoRejectTimer();
    this.incomingCall.set(null); // ferme l'overlay immédiatement

    try {
      // Per protocol §6.2 : POST /call/token AVANT de connecter Twilio
      const resp = await this.videoCallService.getCallToken(call.ChatId, call.IsVideo);
      const params = new URLSearchParams({
        chatId:   call.ChatId,
        isVideo:  String(call.IsVideo),
        roomName: resp.roomName,  // UUID stable = même valeur que RoomName dans IncomingCall
        token:    resp.token,     // JWT Twilio court-terme
        joining:  'true',         // flag callee — le caller est déjà dans la room
      });
      window.open(
        `/call?${params.toString()}`,
        '_blank',
        'width=900,height=700,menubar=no,toolbar=no',
      );
    } catch (err) {
      console.error('Error accepting call:', err);
      // Si l'obtention du token échoue, on refuse proprement
      await this.videoCallService.rejectCall(call.ChatId).catch(() => {});
    }
  }

  async reject(): Promise<void> {
    const call = this.incomingCall();
    if (!call) return;
    this.stopRingtone();
    this.clearAutoRejectTimer();
    this.incomingCall.set(null); // ferme l'UI sans attendre la réponse REST (§6.3)

    // Per protocol §6.3 : POST /call/reject
    try {
      await this.videoCallService.rejectCall(call.ChatId);
    } catch (err) {
      console.error('Error rejecting call:', err);
    }
  }

  private dismiss(): void {
    this.stopRingtone();
    this.clearAutoRejectTimer();
    this.incomingCall.set(null);
  }

  private clearAutoRejectTimer(): void {
    if (this.autoRejectTimer) {
      clearTimeout(this.autoRejectTimer);
      this.autoRejectTimer = undefined;
    }
  }

  private _audioCtx: AudioContext | null = null;
  private _osc: OscillatorNode | null = null;
  private _ringtoneTimeout: ReturnType<typeof setTimeout> | null = null;

  private playRingtone(): void {
    // Use system audio API for a simple ringtone effect
    try {
      this.stopRingtone(); // Stop any existing ringtone first
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this._audioCtx = ctx;
      this._osc = osc;
      // Safety: stop after 30 seconds max
      this._ringtoneTimeout = setTimeout(() => this.stopRingtone(), 30000);
    } catch { /* silently fail */ }
  }

  private stopRingtone(): void {
    if (this._ringtoneTimeout) {
      clearTimeout(this._ringtoneTimeout);
      this._ringtoneTimeout = null;
    }
    try {
      if (this._osc) {
        this._osc.stop();
        this._osc = null;
      }
    } catch { /* ignore - oscillator may already be stopped */ }
    try {
      if (this._audioCtx && this._audioCtx.state !== 'closed') {
        this._audioCtx.close();
      }
      this._audioCtx = null;
    } catch { /* ignore - context may already be closed */ }
  }
}
