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
  @Input() entryId!: number;
  @Input() boardElement!: HTMLElement;
  @Input() draggingEnabled = true;

  @Output() inspectRequest = new EventEmitter<{ el: HTMLElement; state: PinPhotoState }>();
  @Output() dragEnd = new EventEmitter<{ x: number; y: number; rotation: number }>();
  @Output() bringToFront = new EventEmitter<void>();

  // #card = .pin-card-drag   → Draggable moves x/y here
  // #swayEl = .pin-card-sway → RAF rotates this for pendulum
  @ViewChild('card') cardRef!: ElementRef<HTMLElement>;
  @ViewChild('swayEl') swayRef!: ElementRef<HTMLElement>;
  @ViewChild('pinArea') pinAreaRef!: ElementRef<HTMLElement>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private draggable: any = null;

  // ── Pendulum sway state ────────────────────────────────────────────────
  private swayAngle = 0;
  private swayOmega = 0;
  private swayRAF: number | null = null;
  private isDragging = false;

  private readonly GRAVITY   = 0.55;
  private readonly DAMPING   = 0.88;   // higher = settles much faster after drop
  private readonly DRAG_DAMP = 0.80;
  private readonly VEL_SCALE = 0.0005;
  private readonly MAX_ANGLE = 28;

  constructor(private ngZone: NgZone, private hostRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draggingEnabled']) {
      // Don't call draggable.enable()/disable() — it recalculates bounds
      // and can snap cards to wrong positions. We guard in the event handlers instead.
    }
  }

  ngAfterViewInit(): void {
    const dragEl = this.cardRef.nativeElement;
    const swayEl = this.swayRef.nativeElement;

    // Set initial position on the drag wrapper
    gsap.set(dragEl, { x: this.state.x, y: this.state.y });

    // z-index lives on :host (the absolute-positioned element in the stacking context)
    this.hostRef.nativeElement.style.zIndex = String(this.state.zIndex);

    // Rotation on the sway wrapper, pivoting from the pin (top-center)
    gsap.set(swayEl, { rotation: this.state.rotation, transformOrigin: '50% 0%' });

    // Let InertiaPlugin track cursor velocity on the drag element
    InertiaPlugin.track(dragEl, 'x,y');

    this.ngZone.runOutsideAngular(() => {
      this.draggable = Draggable.create(dragEl, {
        type: 'x,y',
        bounds: this.boardElement,
        trigger: this.pinAreaRef.nativeElement,
        zIndexBoost: false,
        cursor: 'grab',
        activeCursor: 'grabbing',
        onPress:     () => this.handlePress(),
        onDragStart: () => this.handleDragStart(),
        onDragEnd:   () => this.handleDragEnd(),
      })[0];
    });
  }

  // ── Drag events ───────────────────────────────────────────────────────

  private handlePress(): void {
    if (!this.draggingEnabled) return;
    this.bringToFront.emit();
  }

  private handleDragStart(): void {
    if (!this.draggingEnabled) {
      // Cancel the drag immediately without touching bounds
      this.draggable?.endDrag();
      return;
    }
    this.isDragging = true;

    gsap.to(this.cardRef.nativeElement, {
      scale: 1.07,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: true,
    });

    this.startSwayLoop();
  }

  private handleDragEnd(): void {
    if (!this.isDragging) return; // was cancelled in handleDragStart
    this.isDragging = false;

    gsap.to(this.cardRef.nativeElement, {
      scale: 1,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: true,
    });

    // Give the pendulum an initial kick based on final drag velocity
    const vx = InertiaPlugin.getVelocity(this.cardRef.nativeElement, 'x') as number;
    this.swayOmega += vx * this.VEL_SCALE * 1.5;

    // New random resting rotation — sway loop will converge to it naturally
    const newRotation = (Math.random() - 0.5) * 22;
    this.state.rotation = newRotation;

    const xVal = gsap.getProperty(this.cardRef.nativeElement, 'x') as number;
    const yVal = gsap.getProperty(this.cardRef.nativeElement, 'y') as number;
    this.dragEnd.emit({ x: xVal, y: yVal, rotation: newRotation });

    // Ensure sway loop is running (may have stopped if card was barely moved)
    this.startSwayLoop(true);
  }

  // ── Pendulum sway RAF loop ─────────────────────────────────────────────

  private startSwayLoop(forceRestart = false): void {
    if (this.swayRAF !== null && !forceRestart) return;
    // Cancel any existing loop before restarting
    if (this.swayRAF !== null) {
      cancelAnimationFrame(this.swayRAF);
      this.swayRAF = null;
    }

    const swayEl = this.swayRef.nativeElement;
    const dragEl = this.cardRef.nativeElement;

    const loop = () => {
      const vx = this.isDragging
        ? (InertiaPlugin.getVelocity(dragEl, 'x') as number)
        : 0;

      const rad     = (this.swayAngle * Math.PI) / 180;
      const restore = -this.GRAVITY * Math.sin(rad);
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

      gsap.set(swayEl, { rotation: this.state.rotation + this.swayAngle });

      if (!this.isDragging && Math.abs(this.swayAngle) < 0.12 && Math.abs(this.swayOmega) < 0.12) {
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

  // ── Public API ─────────────────────────────────────────────────────────

  onCardClick(): void {
    if (this.draggable?.isDragging) return;
    this.inspectRequest.emit({ el: this.cardRef.nativeElement, state: this.state });
  }

  /** Parent calls this to apply z-index immediately on the stacking element */
  applyZIndex(z: number): void {
    // :host is position:absolute — set z-index directly on it
    this.hostRef.nativeElement.style.zIndex = String(z);
  }

  ngOnDestroy(): void {
    if (this.swayRAF !== null) cancelAnimationFrame(this.swayRAF);
    if (this.cardRef?.nativeElement) InertiaPlugin.untrack(this.cardRef.nativeElement);
    if (this.draggable) this.draggable.kill();
  }
}

