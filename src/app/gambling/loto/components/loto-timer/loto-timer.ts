import {
  Component, inject, signal, OnInit, OnDestroy, output
} from '@angular/core';
import { LotoService } from '../../services/loto.service';

@Component({
  selector: 'app-loto-timer',
  standalone: true,
  templateUrl: './loto-timer.html',
  styleUrl:    './loto-timer.css',
})
export class LotoTimerComponent implements OnInit, OnDestroy {
  private svc = inject(LotoService);

  readonly drawTime = output<void>();

  seconds    = signal(60);
  isLoading  = signal(true);
  isFinished = signal(false);

  private interval = 0;

  async ngOnInit(): Promise<void> {
    const res = await this.svc.getTimer();
    this.seconds.set(res.secondsRemaining);
    this.isLoading.set(false);
    this.startCountdown();
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }

  get minutes(): number { return Math.floor(this.seconds() / 60); }
  get secs():    number { return this.seconds() % 60; }
  get progress(): number { return (this.seconds() / 60) * 100; }
  get urgency(): boolean { return this.seconds() <= 10; }

  private startCountdown(): void {
    this.interval = window.setInterval(() => {
      if (this.seconds() <= 0) {
        clearInterval(this.interval);
        this.isFinished.set(true);
        this.drawTime.emit();
        return;
      }
      this.seconds.update(s => s - 1);
    }, 1000);
  }
}
