import {
  Component, inject, signal, OnInit, OnDestroy, ViewChild,
} from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LotoService }            from './services/loto.service';
import { LotoRegisterComponent }  from './components/loto-register/loto-register';
import { LotoWheelComponent }     from './components/loto-wheel/loto-wheel';
import { LotoTimerComponent }     from './components/loto-timer/loto-timer';
import { LotoParticipant, LotoParticipantPublic } from './models/loto.model';
import confetti from 'canvas-confetti';

type PageState = 'lobby' | 'drawing' | 'result';

@Component({
  selector: 'app-loto',
  standalone: true,
  imports: [LotoRegisterComponent, LotoWheelComponent, LotoTimerComponent, MatSnackBarModule],
  templateUrl: './loto.html',
  styleUrl:    './loto.css',
  providers:   [LotoService],
})
export class Loto implements OnInit, OnDestroy {
  @ViewChild(LotoWheelComponent) wheel!: LotoWheelComponent;

  private svc    = inject(LotoService);
  private snack  = inject(MatSnackBar);

  readonly svcRef = this.svc;

  state   = signal<PageState>('lobby');
  winner  = signal<LotoParticipantPublic | null>(null);

  private floatingStars: { x: number; y: number; vx: number; vy: number; life: number; char: string }[] = [];
  private particleLoop = 0;

  async ngOnInit(): Promise<void> {
    this.startAmbientParticles();
    await this.svc.getPublicParticipants();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.particleLoop);
  }

  onRegistered(_p: LotoParticipant): void {
    // Participants signal auto-updated by service
  }

  /** Called by the timer when it hits 0 */
  async onDrawTime(): Promise<void> {
    const participants = this.svc.participants();
    if (participants.length === 0) {
      this.snack.open('⚠️ No participants – draw cancelled.', 'OK', {
        duration: 4000, panelClass: ['loto-snack'],
        horizontalPosition: 'center', verticalPosition: 'top',
      });
      return;
    }

    this.state.set('drawing');

    // Let Angular render the wheel first
    await this.tick();

    try {
      const result = await this.svc.drawWinner();
      this.winner.set(result.winner);
      // Small delay so wheel is visible before it starts spinning
      await this.delay(600);
      this.wheel.spinToWinner(result.winner);
    } catch (e) {
      console.error(e);
    }
  }

  onWheelDone(winner: LotoParticipantPublic): void {
    this.state.set('result');
    this.fireWinnerEffects(winner);
  }

  resetDraw(): void {
    this.winner.set(null);
    this.state.set('lobby');
  }

  private fireWinnerEffects(winner: LotoParticipantPublic): void {
    const fire = (o: confetti.Options) =>
      confetti({ particleCount: 100, spread: 120, origin: { y: 0.55 }, ...o });

    fire({ colors: ['#FFD700','#FF6B6B','#6BCB77','#4D96FF','#CC5DE8'] });
    setTimeout(() => fire({ angle: 60,  origin: { x: 0 } }), 350);
    setTimeout(() => fire({ angle: 120, origin: { x: 1 } }), 700);
    setTimeout(() => confetti({
      particleCount: 200, spread: 200, startVelocity: 35,
      origin: { y: 0.4 }, shapes: ['star'], colors: ['#FFD700','#FFA500','#fff'],
    }), 1100);

    this.snack.open(`🏆 ${winner.name} wins the lottery!`, '🎊', {
      duration:           6000,
      panelClass:         ['loto-snack'],
      horizontalPosition: 'center',
      verticalPosition:   'top',
    });
  }

  get ambientStars() { return this.floatingStars; }

  private startAmbientParticles(): void {
    const chars = '🎟️🎰🏆💰⭐✨🎉🎊';
    const add = () => this.floatingStars.push({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 40,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(Math.random() * 1.2 + 0.4),
      life: 1,
      char: chars[Math.floor(Math.random() * chars.length)],
    });

    const tick = () => {
      this.floatingStars = this.floatingStars
        .map(s => ({ ...s, x: s.x + s.vx, y: s.y + s.vy, life: s.life - 0.0025 }))
        .filter(s => s.life > 0);
      if (Math.random() < 0.03) add();
      this.particleLoop = requestAnimationFrame(tick);
    };
    this.particleLoop = requestAnimationFrame(tick);
  }

  private tick(): Promise<void> {
    return new Promise(r => setTimeout(r, 50));
  }
  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
