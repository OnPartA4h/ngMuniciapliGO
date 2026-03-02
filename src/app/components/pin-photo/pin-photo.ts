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
  @Output() dragEnd = new EventEmitter<{ x: number; y: number }>();
  @Output() bringToFront = new EventEmitter<void>();

  @ViewChild('card') cardRef!: ElementRef<HTMLElement>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private draggable: any = null;

  private swayAngle = 0;
  private swayVelocity = 0;
  private swayRAF: number | null = null;
  private isDragging = false;
  private lastMouseX = 0;
  private mouseVelocityX = 0;
  private lastMouseTime = 0;

  private readonly GRAVITY_COEFF = 3.5;
  private readonly DAMPING = 0.87;
  private readonly MOUSE_INFLUENCE = 0.045;
  private readonly MAX_SWAY = 26;

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
        onDragStart: (e: PointerEvent) => this.handleDragStart(e),
        onDrag: (e: PointerEvent) => this.handleDrag(e),
        onDragEnd: () => this.handleDragEnd(),
      })[0];
    });
  }

  private handleDragStart(e: PointerEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseTime = performance.now();
    this.mouseVelocityX = 0;
    this.bringToFront.emit();

    gsap.to(this.cardRef.nativeElement, {
      scale: 1.09,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: true,
    });

    this.startSwayLoop();
  }

  private handleDrag(e: PointerEvent): void {
    const now = performance.now();
    const dt = (now - this.lastMouseTime) / 1000;
    if (dt > 0.005) {
      const raw = (e.clientX - this.lastMouseX) / dt;
      this.mouseVelocityX = this.mouseVelocityX * 0.65 + raw * 0.35;
    }
    this.lastMouseX = e.clientX;
    this.lastMouseTime = now;
  }

  private handleDragEnd(): void {
    this.isDragging = false;
    this.mouseVelocityX = 0;

    gsap.to(this.cardRef.nativeElement, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: true,
    });

    const xVal = gsap.getProperty(this.cardRef.nativeElement, 'x') as number;
    const yVal = gsap.getProperty(this.cardRef.nativeElement, 'y') as number;
    this.dragEnd.emit({ x: xVal, y: yVal });
  }

  private startSwayLoop(): void {
    if (this.swayRAF !== null) {
      cancelAnimationFrame(this.swayRAF);
      this.swayRAF = null;
    }

    const loop = () => {
      const angleRad = (this.swayAngle * Math.PI) / 180;
      const restoringForce = -this.GRAVITY_COEFF * Math.sin(angleRad);

      if (this.isDragging) {
        this.swayVelocity += restoringForce + this.mouseVelocityX * this.MOUSE_INFLUENCE;
        this.swayVelocity *= 0.92;
      } else {
        this.swayVelocity += restoringForce;
        this.swayVelocity *= this.DAMPING;
      }

      this.swayAngle += this.swayVelocity;
      this.swayAngle = Math.max(-this.MAX_SWAY, Math.min(this.MAX_SWAY, this.swayAngle));

      gsap.set(this.cardRef.nativeElement, {
        rotation: this.state.rotation + this.swayAngle,
      });

      const settled =
        !this.isDragging &&
        Math.abs(this.swayAngle) < 0.08 &&
        Math.abs(this.swayVelocity) < 0.08;

      if (settled) {
        this.swayAngle = 0;
        this.swayVelocity = 0;
        gsap.to(this.cardRef.nativeElement, {
          rotation: this.state.rotation,
          duration: 0.35,
          ease: 'elastic.out(1, 0.6)',
          overwrite: 'auto',
        });
        this.swayRAF = null;
        return;
      }

      this.swayRAF = requestAnimationFrame(loop);
    };

    this.swayRAF = requestAnimationFrame(loop);
  }

  onCardClick(): void {
    if (this.draggable?.isDragging) return;
    this.inspectRequest.emit({
      el: this.cardRef.nativeElement,
      state: this.state,
    });
  }

  ngOnDestroy(): void {
    if (this.swayRAF !== null) cancelAnimationFrame(this.swayRAF);
    if (this.draggable) this.draggable.kill();
  }
}

