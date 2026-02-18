import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  input,
  output,
  signal,
} from '@angular/core';
import { LotoParticipantPublic } from '../../models/loto.model';

// A vibrant palette that cycles for each participant
const PALETTE = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#CC5DE8',
  '#FF922B', '#20C997', '#F06595', '#74C0FC', '#A9E34B',
  '#FFA94D', '#66D9E8', '#E599F7', '#FF8787', '#63E6BE',
];

export interface SliceInfo {
  participant: LotoParticipantPublic;
  color: string;
  startAngle: number; // radians
  endAngle: number;
}

@Component({
  selector: 'app-loto-wheel',
  standalone: true,
  templateUrl: './loto-wheel.html',
  styleUrl:    './loto-wheel.css',
})
export class LotoWheelComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('lotoCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly participants = input.required<LotoParticipantPublic[]>();
  readonly winnerName   = input<string | null>(null);
  readonly spinComplete = output<LotoParticipantPublic>();

  isSpinning = signal(false);

  private currentAngle = 0;
  private animFrameId  = 0;
  private slices: SliceInfo[] = [];

  ngAfterViewInit(): void {
    this.buildSlices();
    this.draw(this.currentAngle);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['participants'] && this.canvasRef) {
      this.buildSlices();
      this.draw(this.currentAngle);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }

  // ── Public API ──────────────────────────────────────────────────
  spinToWinner(winner: LotoParticipantPublic): void {
    if (this.isSpinning()) return;

    const slice = this.slices.find(s => s.participant.name === winner.name);
    if (!slice) return;

    // We want the middle of the winning slice to land at the top (pointer = 270° = 3π/2)
    const sliceMid      = (slice.startAngle + slice.endAngle) / 2;
    const pointerAngle  = (3 * Math.PI) / 2; // top of wheel
    const extraSpins    = 8 * 2 * Math.PI;
    // How many radians do we need to add so that sliceMid lands at pointer?
    let   delta         = pointerAngle - sliceMid;
    // Normalize so delta > 0
    delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    const totalRotation = extraSpins + delta;
    const duration      = 7000;
    const start         = performance.now();
    const startAngle    = this.currentAngle;

    this.isSpinning.set(true);

    const animate = (now: number) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quintic
      const eased    = 1 - Math.pow(1 - progress, 5);
      this.currentAngle = startAngle + totalRotation * eased;
      this.draw(this.currentAngle);

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        this.isSpinning.set(false);
        this.spinComplete.emit(winner);
      }
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  // ── Build proportional slices ───────────────────────────────────
  private buildSlices(): void {
    const parts = this.participants();
    if (!parts.length) { this.slices = []; return; }

    const total = parts.reduce((s, p) => s + p.entries, 0);
    let angle   = 0;
    this.slices = parts.map((p, i) => {
      const sweep = (p.entries / total) * 2 * Math.PI;
      const slice: SliceInfo = {
        participant: p,
        color:       PALETTE[i % PALETTE.length],
        startAngle:  angle,
        endAngle:    angle + sweep,
      };
      angle += sweep;
      return slice;
    });
  }

  // ── Drawing ─────────────────────────────────────────────────────
  private draw(rotationRad: number): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d')!;
    const cx     = canvas.width  / 2;
    const cy     = canvas.height / 2;
    const radius = cx - 14;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.slices.length) {
      this.drawEmpty(ctx, cx, cy, radius);
      return;
    }

    // ── Outer glow ───────────────────────────────────────────────
    const glow = ctx.createRadialGradient(cx, cy, radius - 20, cx, cy, radius + 18);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(1, 'rgba(255,215,0,0.3)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 18, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    // ── Slices ───────────────────────────────────────────────────
    for (const slice of this.slices) {
      const sA = slice.startAngle + rotationRad;
      const eA = slice.endAngle   + rotationRad;

      // Gradient fill
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,   this.lighten(slice.color, 50));
      grad.addColorStop(0.6, slice.color);
      grad.addColorStop(1,   this.darken(slice.color, 30));

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, sA, eA);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // ── Label (only if slice is wide enough) ─────────────────
      const sweep = eA - sA;
      if (sweep > 0.18) {
        const midA   = sA + sweep / 2;
        const labelR = radius * 0.68;
        const lx     = cx + Math.cos(midA) * labelR;
        const ly     = cy + Math.sin(midA) * labelR;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(midA + Math.PI / 2);
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        const name     = slice.participant.name;
        const fontSize = Math.max(9, Math.min(15, Math.floor(sweep * radius * 0.35)));
        ctx.font        = `bold ${fontSize}px 'Inter', sans-serif`;
        ctx.fillStyle   = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur  = 5;

        // Truncate long names
        const maxChars  = Math.max(3, Math.floor(sweep * 18));
        const label     = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
        ctx.fillText(label, 0, 0);

        if (sweep > 0.35) {
          ctx.font      = `${Math.max(8, fontSize - 3)}px 'Inter', sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillText(`×${slice.participant.entries}`, 0, fontSize + 2);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // ── Hub ──────────────────────────────────────────────────────
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
    hubGrad.addColorStop(0, '#ffffff');
    hubGrad.addColorStop(1, '#d4af37');
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, 2 * Math.PI);
    ctx.fillStyle   = hubGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth   = 4;
    ctx.stroke();

    ctx.font         = '26px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎟️', cx, cy);
  }

  private drawEmpty(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle   = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 3;
    ctx.stroke();
    ctx.font         = '16px Inter, sans-serif';
    ctx.fillStyle    = 'rgba(255,255,255,0.3)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No participants yet', cx, cy);
  }

  // ── Color helpers ────────────────────────────────────────────────
  private lighten(hex: string, a: number): string { return this.adj(hex, a);  }
  private darken (hex: string, a: number): string { return this.adj(hex, -a); }
  private adj(hex: string, a: number): string {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + a));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + a));
    const b = Math.min(255, Math.max(0, (n & 0xff) + a));
    return `#${((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;
  }
}
