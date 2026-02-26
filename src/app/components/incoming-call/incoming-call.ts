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
        this.incomingCall.set(event);
        this.playRingtone();
        // Auto-reject after 30 seconds if no response (like real apps)
        this.clearAutoRejectTimer();
        this.autoRejectTimer = setTimeout(() => {
          if (this.incomingCall()) {
            this.reject();
          }
        }, 30000);
      }),
      this.chatHub.callEnded$.subscribe(event => {
        if (this.incomingCall()?.chatId === event.chatId) {
          this.dismiss();
        }
      }),
      this.chatHub.callRejected$.subscribe(event => {
        if (this.incomingCall()?.chatId === event.chatId) {
          this.dismiss();
        }
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

    // Open video call window — mark joining=true so the timer starts right away
    const params = new URLSearchParams({
      chatId: call.chatId,
      isVideo: String(call.isVideo),
      joining: 'true',
    });
    window.open(
      `/call?${params.toString()}`,
      '_blank',
      'width=900,height=700,menubar=no,toolbar=no'
    );
    this.incomingCall.set(null);
  }

  async reject(): Promise<void> {
    const call = this.incomingCall();
    if (!call) return;
    this.stopRingtone();
    this.clearAutoRejectTimer();

    try {
      await this.videoCallService.rejectCall(call.chatId);
    } catch (err) {
      console.error('Error rejecting call:', err);
    }
    this.incomingCall.set(null);
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
