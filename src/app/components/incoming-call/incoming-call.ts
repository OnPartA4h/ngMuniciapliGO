import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ChatHubService } from '../../services/chat-hub.service';
import { VideoCallService } from '../../services/video-call.service';
import { ActiveCallService } from '../../services/active-call.service';
import { IncomingCallEvent } from '../../models/chat';
import { assetUrl } from '../../app.config';

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
  private activeCallService = inject(ActiveCallService);
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
      const callWin = window.open(
        assetUrl(`call?${params.toString()}`),
        '_blank',
        'width=900,height=700,menubar=no,toolbar=no',
      );
      this.activeCallService.registerCallWindow(callWin, call.CallerName);
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
  private _gainNode: GainNode | null = null;
  private _osc1: OscillatorNode | null = null;
  private _osc2: OscillatorNode | null = null;
  private _ringtoneTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Play a pleasant phone-style ringtone:
   * Two gentle tones alternating with silence, like a real phone ring.
   * Pattern: 1s ring, 2s silence, repeat.
   */
  private playRingtone(): void {
    try {
      this.stopRingtone();
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 0; // start silent
      gain.connect(ctx.destination);

      // Schedule a ring pattern: ring for 1s, silent for 2s, repeating
      const now = ctx.currentTime;
      const ringDuration = 1.0;
      const silenceDuration = 2.0;
      const cycleLength = ringDuration + silenceDuration;
      const totalCycles = 10; // ~30s of ringing

      for (let i = 0; i < totalCycles; i++) {
        const start = now + i * cycleLength;
        // Fade in
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
        // Hold
        gain.gain.setValueAtTime(0.15, start + ringDuration - 0.05);
        // Fade out
        gain.gain.linearRampToValueAtTime(0, start + ringDuration);
      }

      // Two oscillators for a dual-tone ring (like a real phone)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 440; // A4
      osc1.connect(gain);
      osc1.start();

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 480; // slightly above A4 — classic phone ring
      const gain2 = ctx.createGain();
      gain2.gain.value = 0;
      gain2.connect(ctx.destination);
      osc2.connect(gain2);
      osc2.start();

      // Same gain pattern for second oscillator
      for (let i = 0; i < totalCycles; i++) {
        const start = now + i * cycleLength;
        gain2.gain.setValueAtTime(0, start);
        gain2.gain.linearRampToValueAtTime(0.1, start + 0.05);
        gain2.gain.setValueAtTime(0.1, start + ringDuration - 0.05);
        gain2.gain.linearRampToValueAtTime(0, start + ringDuration);
      }

      this._audioCtx = ctx;
      this._gainNode = gain;
      this._osc1 = osc1;
      this._osc2 = osc2;

      // Safety: stop after 30s max
      this._ringtoneTimeout = setTimeout(() => this.stopRingtone(), 30000);
    } catch { /* silently fail if audio not available */ }
  }

  private stopRingtone(): void {
    if (this._ringtoneTimeout) {
      clearTimeout(this._ringtoneTimeout);
      this._ringtoneTimeout = null;
    }
    try {
      if (this._osc1) { this._osc1.stop(); this._osc1 = null; }
    } catch { /* ignore */ }
    try {
      if (this._osc2) { this._osc2.stop(); this._osc2 = null; }
    } catch { /* ignore */ }
    this._gainNode = null;
    try {
      if (this._audioCtx && this._audioCtx.state !== 'closed') {
        this._audioCtx.close();
      }
      this._audioCtx = null;
    } catch { /* ignore */ }
  }
}
