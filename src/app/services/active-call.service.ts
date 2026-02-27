import { Injectable, signal, OnDestroy } from '@angular/core';

/**
 * Tracks whether a call window is currently open.
 * Used to display an "active call" banner in the main app header
 * and to refocus the call window when clicked.
 */
@Injectable({ providedIn: 'root' })
export class ActiveCallService implements OnDestroy {
  /** The currently open call popup window reference. */
  private callWindow: Window | null = null;
  private pollInterval?: ReturnType<typeof setInterval>;

  /** Reactive signal: is there an active call? */
  readonly isCallActive = signal(false);

  /** Display name of the person / group being called. */
  readonly callPeerName = signal('');

  /** Duration in seconds since the call window was opened. */
  readonly callDuration = signal(0);

  private durationStart = 0;

  /**
   * Register a newly opened call window.
   * Called from chat-detail.startCall() and incoming-call.accept().
   */
  registerCallWindow(win: Window | null, peerName: string): void {
    // If there's already a tracked window, don't overwrite (could be a duplicate click)
    if (this.callWindow && !this.callWindow.closed) {
      this.callWindow.focus();
      return;
    }

    this.callWindow = win;
    this.callPeerName.set(peerName);
    this.callDuration.set(0);
    this.durationStart = Date.now();
    this.isCallActive.set(true);

    // Poll to detect when the window is closed
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      if (!this.callWindow || this.callWindow.closed) {
        this.clearCall();
      } else {
        this.callDuration.set(Math.floor((Date.now() - this.durationStart) / 1000));
      }
    }, 1000);
  }

  /** Bring the call window back to the foreground. */
  focusCallWindow(): void {
    if (this.callWindow && !this.callWindow.closed) {
      this.callWindow.focus();
    }
  }

  /** Manually clear the active call state (e.g. when call ends via SignalR). */
  clearCall(): void {
    this.stopPolling();
    this.callWindow = null;
    this.isCallActive.set(false);
    this.callPeerName.set('');
    this.callDuration.set(0);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
