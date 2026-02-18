import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  output,
} from '@angular/core';
import { SpinWheelService } from '../../services/spin-wheel.service';
import { WheelPrize } from '../../models/wheel-prize.model';

@Component({
  selector: 'app-wheel-canvas',
  standalone: true,
  templateUrl: './wheel-canvas.html',
  styleUrl:    './wheel-canvas.css',
})
export class WheelCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wheelCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly spinComplete = output<WheelPrize>();

  private svc = inject(SpinWheelService);

  isSpinning = signal(false);

  private currentAngle = 0;  // degrees, cumulative
  private animFrameId = 0;

  ngAfterViewInit(): void {
    this.drawWheel(this.currentAngle);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  spin(): void {
    if (this.isSpinning()) return;

    const prize        = this.svc.pickPrize();
    const target       = this.svc.getTargetAngle(prize);
    const totalRotation = target; // total degrees to add from current position
    const duration      = 5500;  // ms
    const start         = performance.now();
    const startAngle    = this.currentAngle;

    this.isSpinning.set(true);

    const animate = (now: number) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Custom easing: fast then ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      this.currentAngle = startAngle + totalRotation * eased;
      this.drawWheel(this.currentAngle);

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        this.currentAngle = startAngle + totalRotation;
        this.isSpinning.set(false);
        this.svc.recordResult(prize);
        this.spinComplete.emit(prize);
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  // ─── Drawing ───────────────────────────────────────────────────────────────

  private drawWheel(angleDeg: number): void {
    const canvas  = this.canvasRef.nativeElement;
    const ctx     = canvas.getContext('2d')!;
    const prizes  = this.svc.prizes;
    const n       = prizes.length;
    const cx      = canvas.width  / 2;
    const cy      = canvas.height / 2;
    const radius  = cx - 10;
    const slice   = (2 * Math.PI) / n;
    const offset  = (angleDeg * Math.PI) / 180;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Outer glow ring ─────────────────────────────────────────────────────
    const glow = ctx.createRadialGradient(cx, cy, radius - 20, cx, cy, radius + 15);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(1, 'rgba(255,220,50,0.35)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 15, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    // ── Slices ───────────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const startA = offset + i * slice - Math.PI / 2;
      const endA   = startA + slice;
      const prize  = prizes[i];

      // Segment fill (gradient)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,   this.lighten(prize.color, 60));
      grad.addColorStop(0.5, prize.color);
      grad.addColorStop(1,   this.darken(prize.color, 25));

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth   = 3;
      ctx.stroke();

      // ── Label ─────────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + slice / 2);
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';

      // Emoji
      ctx.font = `${Math.floor(radius * 0.1)}px serif`;
      ctx.fillText(prize.emoji, radius - 10, 0);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur  = 4;
      ctx.font = `bold ${Math.floor(radius * 0.075)}px 'Inter', sans-serif`;
      ctx.fillText(prize.label, radius - 40, 0);
      ctx.shadowBlur  = 0;

      ctx.restore();
    }

    // ── Center hub ───────────────────────────────────────────────────────────
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 36);
    hubGrad.addColorStop(0, '#ffffff');
    hubGrad.addColorStop(1, '#d4af37');
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, 2 * Math.PI);
    ctx.fillStyle   = hubGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth   = 4;
    ctx.stroke();

    // Star on hub
    ctx.font = '28px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', cx, cy);
  }

  // ─── Color helpers ─────────────────────────────────────────────────────────

  private lighten(hex: string, amount: number): string {
    return this.adjustColor(hex, amount);
  }

  private darken(hex: string, amount: number): string {
    return this.adjustColor(hex, -amount);
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r   = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g   = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b   = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }
}
