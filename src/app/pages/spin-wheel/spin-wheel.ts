import {
  Component,
  inject,
  signal,
  ViewChild,
  OnInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SpinWheelService } from './services/spin-wheel.service';
import { WheelCanvasComponent } from './components/wheel-canvas/wheel-canvas';
import { WheelPrize } from './models/wheel-prize.model';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-spin-wheel',
  standalone: true,
  imports: [WheelCanvasComponent, MatSnackBarModule],
  templateUrl: './spin-wheel.html',
  styleUrl:    './spin-wheel.css',
  providers:   [SpinWheelService],
})
export class SpinWheel implements OnInit, OnDestroy {
  @ViewChild(WheelCanvasComponent) wheelCanvas!: WheelCanvasComponent;

  private snackBar = inject(MatSnackBar);
  readonly svc     = inject(SpinWheelService);

  isSpinning   = signal(false);
  lastPrize    = signal<WheelPrize | null>(null);
  showResult   = signal(false);

  private particleLoop = 0;
  private floatingStars: { x: number; y: number; vx: number; vy: number; life: number; char: string }[] = [];

  ngOnInit(): void {
    this.startAmbientParticles();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.particleLoop);
  }

  spin(): void {
    if (this.isSpinning()) return;
    this.isSpinning.set(true);
    this.showResult.set(false);
    this.wheelCanvas.spin();
  }

  onSpinComplete(prize: WheelPrize): void {
    this.isSpinning.set(false);
    this.lastPrize.set(prize);
    this.showResult.set(true);
    this.fireConfetti();
    this.showToast(prize);
  }

  private showToast(prize: WheelPrize): void {
    this.snackBar.open(
      `${prize.emoji}  You won: ${prize.label}!`,
      '🎊 Awesome!',
      {
        duration:           5000,
        panelClass:         ['spin-wheel-snack'],
        horizontalPosition: 'center',
        verticalPosition:   'top',
      }
    );
  }

  private fireConfetti(): void {
    const fire = (opts: confetti.Options) =>
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, ...opts });

    fire({ colors: ['#FFD700', '#FF6B6B', '#6BCB77', '#4D96FF', '#CC5DE8'] });
    setTimeout(() => fire({ angle: 60,  origin: { x: 0 } }), 300);
    setTimeout(() => fire({ angle: 120, origin: { x: 1 } }), 600);
    setTimeout(() =>
      confetti({ particleCount: 150, spread: 180, startVelocity: 30,
        origin: { y: 0.5 }, shapes: ['star'], colors: ['#FFD700', '#FFA500'] }),
      900
    );
  }

  // ── Ambient floating stars in background ─────────────────────────────────
  private startAmbientParticles(): void {
    const stars = '⭐🌟✨💫';
    const add = () => {
      this.floatingStars.push({
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 40,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(Math.random() * 1.5 + 0.5),
        life: 1,
        char: stars[Math.floor(Math.random() * stars.length)],
      });
    };

    const tick = () => {
      this.floatingStars = this.floatingStars
        .map(s => ({ ...s, x: s.x + s.vx, y: s.y + s.vy, life: s.life - 0.003 }))
        .filter(s => s.life > 0);
      if (Math.random() < 0.04) add();
      this.particleLoop = requestAnimationFrame(tick);
    };
    this.particleLoop = requestAnimationFrame(tick);
  }

  get ambientStars() {
    return this.floatingStars;
  }
}
