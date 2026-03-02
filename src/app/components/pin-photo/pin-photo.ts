import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { Draggable } from 'gsap/all';

gsap.registerPlugin(Draggable);

export interface PinPhoto {
  url: string;
  text: string;
}

export interface PinPhotoState {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

@Component({
  selector: 'app-pin-photo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pin-photo.html',
  styleUrl: './pin-photo.css',
})
export class PinPhotoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() photo!: PinPhoto;
  @Input() state!: PinPhotoState;
  @Input() boardElement!: HTMLElement;
  @Input() draggingEnabled = true;

  @Output() inspectRequest = new EventEmitter<{ el: HTMLElement; state: PinPhotoState }>();
  @Output() dragEnd = new EventEmitter<{ x: number; y: number; rotation: number }>();
  @Output() bringToFront = new EventEmitter<void>();

  @ViewChild('card') cardRef!: ElementRef<HTMLElement>;
  @ViewChild('pinArea') pinAreaRef!: ElementRef<HTMLElement>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private draggable: any = null;

  // ── Sway physics ──────────────────────────────────────────────────────
  private swayAngle = 0;       // current pendulum angle (degrees)
  private swayVelocity = 0;    // angular velocity (degrees/frame)
  private swayRAF: number | null = null;
  private isDragging = false;

  // Mouse tracking for sway impulse
  private prevDragX = 0;
  private prevDragTime = 0;
  private dragAccelX = 0;       // smoothed horizontal acceleration of cursor
  private prevVelocityX = 0;

  // Tuning constants – pendulum feel
  private readonly GRAVITY = 0.45;       // restoring force strength
  private readonly DAMPING = 0.96;       // air friction (1 = none, lower = more friction)
  private readonly DRAG_DAMPING = 0.88;  // extra damping while dragging
  private readonly ACCEL_FACTOR = 0.12;  // how much cursor acceleration affects sway
  private readonly MAX_SWAY = 35;        // max swing angle

  constructor(private ngZone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draggingEnabled'] && this.draggable) {
      if (this.draggingEnabled) {
        this.draggable.enable();
      } else {
        this.draggable.disable();
      }
    }
  }

  ngAfterViewInit(): void {
    const el = this.cardRef.nativeElement;

    gsap.set(el, {
      x: this.state.x,
      y: this.state.y,
      rotation: this.state.rotation,
      zIndex: this.state.zIndex,
      transformOrigin: '50% 0%',
    });

    this.ngZone.runOutsideAngular(() => {
      this.draggable = Draggable.create(el, {
        type: 'x,y',
        bounds: this.boardElement,
        trigger: this.pinAreaRef.nativeElement,
        onDragStart: (e: PointerEvent) => this.onDragStart(e),
        onDrag: (e: PointerEvent) => this.onDrag(e),
        onDragEnd: () => this.onDragEnd(),
      })[0];
    });
  }

  // ── Drag lifecycle ────────────────────────────────────────────────────

  private onDragStart(e: PointerEvent): void {
    this.isDragging = true;
    this.prevDragX = e.clientX;
    this.prevDragTime = performance.now();
    this.prevVelocityX = 0;
    this.dragAccelX = 0;

    // Slight scale lift
    gsap.to(this.cardRef.nativeElement, {
      scale: 1.06,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: true,
    });

    this.startSwayLoop();
  }

  private onDrag(e: PointerEvent): void {
    const now = performance.now();
    const dt = (now - this.prevDragTime) / 1000;
    if (dt < 0.005) return; // skip tiny frames

    const velocityX = (e.clientX - this.prevDragX) / dt;
    // Acceleration = change in velocity
    const accel = (velocityX - this.prevVelocityX) / dt;
    // Smooth it
    this.dragAccelX = this.dragAccelX * 0.6 + accel * 0.4;

    this.prevVelocityX = velocityX;
    this.prevDragX = e.clientX;
    this.prevDragTime = now;
  }

  private onDragEnd(): void {
    this.isDragging = false;

    // Drop scale
    gsap.to(this.cardRef.nativeElement, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: true,
    });

    // New random rotation on drop
    const newRotation = (Math.random() - 0.5) * 22;

    const xVal = gsap.getProperty(this.cardRef.nativeElement, 'x') as number;
    const yVal = gsap.getProperty(this.cardRef.nativeElement, 'y') as number;
    this.dragEnd.emit({ x: xVal, y: yVal, rotation: newRotation });
  }

  // ── Pendulum sway simulation ──────────────────────────────────────────

  private startSwayLoop(): void {
    if (this.swayRAF !== null) {
      cancelAnimationFrame(this.swayRAF);
      this.swayRAF = null;
    }

    const loop = () => {
      // Gravity restoring torque (pendulum)
      const angleRad = (this.swayAngle * Math.PI) / 180;
      const gravity = -this.GRAVITY * Math.sin(angleRad);

      if (this.isDragging) {
        // Cursor acceleration pushes the pendulum
        this.swayVelocity += gravity - this.dragAccelX * this.ACCEL_FACTOR;
        this.swayVelocity *= this.DRAG_DAMPING;
      } else {
        // Free swing with lighter damping
        this.swayVelocity += gravity;
        this.swayVelocity *= this.DAMPING;
      }

      this.swayAngle += this.swayVelocity;
      this.swayAngle = Math.max(-this.MAX_SWAY, Math.min(this.MAX_SWAY, this.swayAngle));

      gsap.set(this.cardRef.nativeElement, {
        rotation: this.state.rotation + this.swayAngle,
      });

      // Check if settled
      const settled =
        !this.isDragging &&
        Math.abs(this.swayAngle) < 0.1 &&
        Math.abs(this.swayVelocity) < 0.1;

      if (settled) {
        this.swayAngle = 0;
        this.swayVelocity = 0;
        gsap.to(this.cardRef.nativeElement, {
          rotation: this.state.rotation,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        this.swayRAF = null;
        return;
      }

      this.swayRAF = requestAnimationFrame(loop);
    };

    this.swayRAF = requestAnimationFrame(loop);
  }

  // ── User interactions ─────────────────────────────────────────────────

  onCardClick(): void {
    if (this.draggable?.isDragging) return;
    this.inspectRequest.emit({
      el: this.cardRef.nativeElement,
      state: this.state,
    });
  }

  /** Pin mousedown → bring card to front immediately (before GSAP drag fires) */
  onPinMousedown(_event: MouseEvent): void {
    this.bringToFront.emit();
  }

  /** Apply a z-index directly on the GSAP-controlled element */
  applyZIndex(z: number): void {
    gsap.set(this.cardRef.nativeElement, { zIndex: z });
  }

  ngOnDestroy(): void {
    if (this.swayRAF !== null) cancelAnimationFrame(this.swayRAF);
    if (this.draggable) this.draggable.kill();
  }
}

