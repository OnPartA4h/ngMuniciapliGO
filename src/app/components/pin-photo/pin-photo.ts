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
import { Draggable, InertiaPlugin } from 'gsap/all';

gsap.registerPlugin(Draggable, InertiaPlugin);

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

  // cardRef = .pin-photo-wrapper  → cible du Draggable (x, y)
  @ViewChild('card') cardRef!: ElementRef<HTMLElement>;
  // wrapperRef = .pin-wrapper-inner → cible de la rotation/sway
  @ViewChild('swayEl') swayRef!: ElementRef<HTMLElement>;
  @ViewChild('pinArea') pinAreaRef!: ElementRef<HTMLElement>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private draggable: any = null;

  // ── Sway (pendulum RAF loop) ───────────────────────────────────────────
  private swayAngle = 0;
  private swayOmega = 0;      // angular velocity deg/frame
  private swayRAF: number | null = null;
  private isDragging = false;

  // Velocity tracking via InertiaPlugin.track()
  private readonly GRAVITY    = 0.55;   // pendulum restoring strength
  private readonly DAMPING    = 0.972;  // free-swing friction (per frame)
  private readonly DRAG_DAMP  = 0.91;   // heavier friction while held
  private readonly VEL_SCALE  = 0.0008; // cursor px/s → angular impulse
  private readonly MAX_ANGLE  = 38;     // deg clamp

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
    const dragEl = this.cardRef.nativeElement;   // moves with x/y
    const swayEl = this.swayRef.nativeElement;   // rotates for sway

    // Position via GSAP on the draggable element
    gsap.set(dragEl, {
      x: this.state.x,
      y: this.state.y,
      zIndex: this.state.zIndex,
    });

    // Initial rotation on the sway wrapper
    gsap.set(swayEl, {
      rotation: this.state.rotation,
      transformOrigin: '50% 0%',
    });

    // Track velocity on the draggable element so InertiaPlugin can read it
    InertiaPlugin.track(dragEl, 'x,y');

    this.ngZone.runOutsideAngular(() => {
      this.draggable = Draggable.create(dragEl, {
        type: 'x,y',
        bounds: this.boardElement,
        trigger: this.pinAreaRef.nativeElement,
        zIndexBoost: false,   // we manage z-index ourselves
        cursor: 'grab',
        activeCursor: 'grabbing',
        onPress:    () => this.handlePress(),
        onDragStart: () => this.handleDragStart(),
        onDrag:     () => this.handleDragMove(),
        onDragEnd:  () => this.handleDragEnd(),
      })[0];
    });
  }

  // ── Drag events ───────────────────────────────────────────────────────

  private handlePress(): void {
    // Fires immediately on mousedown — elevate z-index at once
    this.bringToFront.emit();
  }

  private handleDragStart(): void {
    this.isDragging = true;

    gsap.to(this.cardRef.nativeElement, {
      scale: 1.07,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: true,
    });

    this.startSwayLoop();
  }

  private handleDragMove(): void {
    // Nothing to do here — velocity is read from InertiaPlugin in the RAF loop
  }

  private handleDragEnd(): void {
    this.isDragging = false;

    const dragEl  = this.cardRef.nativeElement;
    const swayEl  = this.swayRef.nativeElement;

    // Scale back down
    gsap.to(dragEl, {
      scale: 1,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: true,
    });

    // Randomize final resting rotation
    const newRotation = (Math.random() - 0.5) * 22;
    this.state.rotation = newRotation;

    // Let the sway loop settle naturally into the new angle
    // (loop already running — it will converge to state.rotation)

    const xVal = gsap.getProperty(dragEl, 'x') as number;
    const yVal = gsap.getProperty(dragEl, 'y') as number;
    this.dragEnd.emit({ x: xVal, y: yVal, rotation: newRotation });
  }

  // ── Pendulum sway RAF loop ────────────────────────────────────────────

  private startSwayLoop(): void {
    if (this.swayRAF !== null) return; // already running

    const swayEl = this.swayRef.nativeElement;
    const dragEl = this.cardRef.nativeElement;

    const loop = () => {
      // Read cursor velocity from InertiaPlugin (px/s)
      const vx = this.isDragging
        ? (InertiaPlugin.getVelocity(dragEl, 'x') as number)
        : 0;

      // Pendulum restoring force
      const rad = (this.swayAngle * Math.PI) / 180;
      const restore = -this.GRAVITY * Math.sin(rad);

      // Cursor horizontal velocity creates an angular impulse (inertia effect)
      const impulse = vx * this.VEL_SCALE;

      if (this.isDragging) {
        this.swayOmega += restore + impulse;
        this.swayOmega *= this.DRAG_DAMP;
      } else {
        this.swayOmega += restore;
        this.swayOmega *= this.DAMPING;
      }

      this.swayAngle += this.swayOmega;
      this.swayAngle = Math.max(-this.MAX_ANGLE, Math.min(this.MAX_ANGLE, this.swayAngle));

      // Apply rotation directly (no tween — frame-accurate)
      gsap.set(swayEl, { rotation: this.state.rotation + this.swayAngle });

      // Settle check (only when not dragging)
      if (!this.isDragging && Math.abs(this.swayAngle) < 0.15 && Math.abs(this.swayOmega) < 0.15) {
        this.swayAngle = 0;
        this.swayOmega = 0;
        gsap.set(swayEl, { rotation: this.state.rotation });
        this.swayRAF = null;
        return;
      }

      this.swayRAF = requestAnimationFrame(loop);
    };

    this.swayRAF = requestAnimationFrame(loop);
  }

  // ── Public API ────────────────────────────────────────────────────────

  onCardClick(): void {
    if (this.draggable?.isDragging) return;
    this.inspectRequest.emit({
      el: this.cardRef.nativeElement,
      state: this.state,
    });
  }

  /** Called by parent to immediately apply z-index on the GSAP element */
  applyZIndex(z: number): void {
    gsap.set(this.cardRef.nativeElement, { zIndex: z });
  }

  ngOnDestroy(): void {
    if (this.swayRAF !== null) cancelAnimationFrame(this.swayRAF);
    InertiaPlugin.untrack(this.cardRef?.nativeElement);
    if (this.draggable) this.draggable.kill();
  }
}

