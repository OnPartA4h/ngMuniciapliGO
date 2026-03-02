import {
  Component,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { Draggable } from 'gsap/all';
import { PinPhotoComponent, PinPhoto, PinPhotoState } from '../../components/pin-photo/pin-photo';

gsap.registerPlugin(Draggable);

export interface PinPhotoEntry {
  photo: PinPhoto;
  state: PinPhotoState;
  id: number;
}

@Component({
  selector: 'app-pin-board',
  standalone: true,
  imports: [CommonModule, PinPhotoComponent],
  templateUrl: './pin-board.html',
  styleUrl: './pin-board.css',
})
export class PinBoard implements AfterViewInit, OnDestroy {
  @ViewChild('board') boardRef!: ElementRef<HTMLElement>;
  @ViewChild('viewport') viewportRef!: ElementRef<HTMLElement>;
  @ViewChildren(PinPhotoComponent) pinPhotoComponents!: QueryList<PinPhotoComponent>;

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  // ── Photo data ──────────────────────────────────────────────────────────
  photos: PinPhoto[] = [
    // Square
    { url: 'https://picsum.photos/seed/park/400/400',     text: 'A walk in the park' },
    // Landscape wide
    { url: 'https://picsum.photos/seed/city/800/400',     text: 'City lights' },
    // Portrait tall
    { url: 'https://picsum.photos/seed/mountain/300/600', text: 'Mountain view' },
    // Landscape HD
    { url: 'https://picsum.photos/seed/beach/1200/600',   text: 'Beach day' },
    // Portrait HD
    { url: 'https://picsum.photos/seed/forest/600/1200',  text: 'Into the woods' },
    // Square large
    { url: 'https://picsum.photos/seed/sunset/900/900',   text: 'Golden hour' },
    // Landscape ultra-wide
    { url: 'https://picsum.photos/seed/street/1600/500',  text: 'Street vibes' },
    // Portrait small
    { url: 'https://picsum.photos/seed/portrait/200/400', text: 'Candid moment' },
  ];

  entries: PinPhotoEntry[] = [];

  // ── State ────────────────────────────────────────────────────────────────
  isInspecting = false;
  private topZIndex = 10;

  ngAfterViewInit(): void {
    document.querySelector('main')?.classList.add('page-fullscreen');
    this.scatter();
  }

  private scatter(): void {
    const board = this.boardRef.nativeElement;
    const boardW = board.clientWidth;
    const boardH = board.clientHeight;

    const cardW = 180;
    const cardH = 260;
    const padding = 40;

    this.entries = this.photos.map((photo, i) => {
      const x = padding + Math.random() * (boardW - cardW - padding * 2);
      const y = padding + Math.random() * (boardH - cardH - padding * 2);
      const rotation = (Math.random() - 0.5) * 22;

      return {
        photo,
        state: { x, y, rotation, zIndex: i + 1 },
        id: i,
      };
    });

    this.topZIndex = this.entries.length + 1;
  }

  /** Increment global z-index counter, update entry model, apply to DOM immediately */
  bringToFront(entry: PinPhotoEntry): void {
    this.topZIndex++;
    entry.state.zIndex = this.topZIndex;

    // Find the matching child component by entryId and apply z-index directly to :host
    const comp = this.pinPhotoComponents?.find(c => c.entryId === entry.id);
    comp?.applyZIndex(this.topZIndex);
  }

  onDragEnd(entry: PinPhotoEntry, pos: { x: number; y: number; rotation: number }): void {
    entry.state.x = pos.x;
    entry.state.y = pos.y;
    entry.state.rotation = pos.rotation;
  }

  onInspectRequest(entry: PinPhotoEntry, payload: { el: HTMLElement; state: PinPhotoState }): void {
    if (this.isInspecting) return;
    this.isInspecting = true;

    const viewport = this.viewportRef.nativeElement;
    const boardW = this.boardRef.nativeElement.clientWidth;
    const boardH = this.boardRef.nativeElement.clientHeight;

    const cardW = 180;
    const cardH = 260;

    const cardCenterX = payload.state.x + cardW / 2;
    const cardCenterY = payload.state.y + cardH / 2;

    const targetScale = 2.8;
    const translateX = boardW / 2 - cardCenterX * targetScale;
    const translateY = boardH / 2 - cardCenterY * targetScale;

    gsap.to(viewport, {
      scale: targetScale,
      x: translateX,
      y: translateY,
      duration: 0.8,
      ease: 'power3.inOut',
    });
  }

  exitInspect(): void {
    if (!this.isInspecting) return;
    // Immediately clear the state so Angular removes the overlay on this frame
    this.isInspecting = false;
    this.cdr.markForCheck();

    const viewport = this.viewportRef.nativeElement;
    gsap.to(viewport, {
      scale: 1,
      x: 0,
      y: 0,
      duration: 0.7,
      ease: 'power3.inOut',
    });
  }

  trackById(_index: number, entry: PinPhotoEntry): number {
    return entry.id;
  }

  ngOnDestroy(): void {
    document.querySelector('main')?.classList.remove('page-fullscreen');
  }
}
