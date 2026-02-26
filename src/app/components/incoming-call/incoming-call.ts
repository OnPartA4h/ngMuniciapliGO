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
  private ringtoneAudio?: HTMLAudioElement;

  ngOnInit(): void {
    this.subs.push(
      this.chatHub.incomingCall$.subscribe(event => {
        this.incomingCall.set(event);
        this.playRingtone();
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
    this.stopRingtone();
  }

  async accept(): Promise<void> {
    const call = this.incomingCall();
    if (!call) return;
    this.stopRingtone();

    // Open video call window
    const params = new URLSearchParams({
      chatId: call.chatId,
      isVideo: String(call.isVideo),
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

    try {
      await this.videoCallService.rejectCall(call.chatId);
    } catch (err) {
      console.error('Error rejecting call:', err);
    }
    this.incomingCall.set(null);
  }

  private dismiss(): void {
    this.stopRingtone();
    this.incomingCall.set(null);
  }

  private playRingtone(): void {
    // Use system audio API for a simple ringtone effect
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      // Stop after 30 seconds max
      setTimeout(() => { osc.stop(); ctx.close(); }, 30000);
      (this as any)._audioCtx = ctx;
      (this as any)._osc = osc;
    } catch { /* silently fail */ }
  }

  private stopRingtone(): void {
    try {
      (this as any)?._osc?.stop();
      (this as any)?._audioCtx?.close();
    } catch { /* silently fail */ }
  }
}
