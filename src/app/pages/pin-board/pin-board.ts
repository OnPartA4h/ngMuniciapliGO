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
  @ViewChild('board')    boardRef!:    ElementRef<HTMLElement>;
  @ViewChild('viewport') viewportRef!: ElementRef<HTMLElement>;
  @ViewChildren(PinPhotoComponent) pinPhotoComponents!: QueryList<PinPhotoComponent>;

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  // ── Photo data ──────────────────────────────────────────────────────────
  photos: PinPhoto[] = [
    { url: '/assets/images/board_page/joel.jpg',    text: 'Le Joël de la parole 🗣️' },
    { url: '/assets/images/board_page/equipe1.jpg',    text: 'Les membres de l\'équipe 3 debout' },
    { url: '/assets/images/board_page/equipe2.jpg',    text: 'Les membres de l\'équipe 3 assis' },
    { url: '/assets/images/board_page/photos_prof.jpg',    text: 'Le roi et ses sujets 🌱👑' },
    { url: '/assets/images/board_page/tableau_blanc.jpg',    text: 'Architecture et planification de projet' },
    { url: '/assets/images/board_page/gh_team.png',    text: 'Notre philosophie d\'équipe' },
  ];

  entries: PinPhotoEntry[] = [];

  // ── State ────────────────────────────────────────────────────────────────
  isInspecting = false;
  private topZIndex = 10;
  private resizeObserver: ResizeObserver | null = null;
  private scatterDone = false;

  ngAfterViewInit(): void {
    document.querySelector('main')?.classList.add('page-fullscreen');

    const board = this.boardRef.nativeElement;

    // The board may have zero dimensions right after navigation (before layout).
    // Use ResizeObserver to wait for real dimensions before scattering.
    this.ngZone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(entries => {
        const rect = entries[0].contentRect;
        if (rect.width > 0 && rect.height > 0 && !this.scatterDone) {
          this.scatterDone = true;
          this.resizeObserver!.disconnect();
          this.ngZone.run(() => this.scatter());
        }
      });
      this.resizeObserver.observe(board);
    });

    // Fallback: if already has size (e.g. page reload), scatter immediately
    if (board.clientWidth > 0 && board.clientHeight > 0) {
      this.scatterDone = true;
      this.resizeObserver?.disconnect();
      this.scatter();
    }
  }

  // ── Grid-jitter scatter ─────────────────────────────────────────────────
  // Divides the board into a grid of N cells, places one card per cell with
  // random jitter inside the cell. Guarantees full-board coverage while still
  // looking random. Overlap is allowed (cards are small relative to cells).
  private scatter(): void {
    const board   = this.boardRef.nativeElement;
    const boardW  = board.clientWidth;
    const boardH  = board.clientHeight;
    const n       = this.photos.length;

    const cardW   = 180;
    const cardH   = 260;
    const padding = 32;

    // Usable area
    const areaW = boardW - cardW  - padding * 2;
    const areaH = boardH - cardH - padding * 2;

    // Find grid dimensions (cols × rows) closest to screen aspect ratio
    const aspect = areaW / areaH;
    const cols   = Math.max(1, Math.round(Math.sqrt(n * aspect)));
    const rows   = Math.max(1, Math.ceil(n / cols));

    const cellW  = areaW / cols;
    const cellH  = areaH / rows;

    // Jitter: cards can wander up to 35% of cell size from cell center
    const jitterX = cellW * 0.35;
    const jitterY = cellH * 0.35;

    // Shuffle photo order so same photos don't always end up in same region
    const shuffled = [...this.photos].sort(() => Math.random() - 0.5);

    this.entries = shuffled.map((photo, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const cellCenterX = padding + col * cellW + cellW / 2;
      const cellCenterY = padding + row * cellH + cellH / 2;

      const x = Math.max(padding, Math.min(boardW - cardW - padding,
        cellCenterX - cardW / 2 + (Math.random() - 0.5) * 2 * jitterX));
      const y = Math.max(padding, Math.min(boardH - cardH - padding,
        cellCenterY - cardH / 2 + (Math.random() - 0.5) * 2 * jitterY));

      const rotation = (Math.random() - 0.5) * 22;

      // Find original index for stable id
      const originalIndex = this.photos.indexOf(photo);
      return {
        photo,
        state: { x, y, rotation, zIndex: originalIndex + 1 },
        id: originalIndex,
      };
    });

    this.topZIndex = this.entries.length + 1;
    this.cdr.detectChanges();
  }

  /** Increment global z-index counter, update entry model, apply to DOM immediately */
  bringToFront(entry: PinPhotoEntry): void {
    this.topZIndex++;
    entry.state.zIndex = this.topZIndex;

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
    const boardW   = this.boardRef.nativeElement.clientWidth;
    const boardH   = this.boardRef.nativeElement.clientHeight;

    const cardW = 180;
    const cardH = 260;

    const cardCenterX = payload.state.x + cardW / 2;
    const cardCenterY = payload.state.y + cardH / 2;

    const targetScale = 2.8;
    const translateX  = boardW / 2 - cardCenterX * targetScale;
    const translateY  = boardH / 2 - cardCenterY * targetScale;

    // bg is inside the viewport — it zooms exactly with the cards, no separate animation needed
    gsap.to(viewport, {
      scale: targetScale, x: translateX, y: translateY,
      duration: 0.8, ease: 'power3.inOut',
    });
  }

  exitInspect(): void {
    if (!this.isInspecting) return;
    this.isInspecting = false;
    this.cdr.markForCheck();

    const viewport = this.viewportRef.nativeElement;

    gsap.to(viewport, {
      scale: 1, x: 0, y: 0,
      duration: 0.7, ease: 'power3.inOut',
    });
  }

  trackById(_index: number, entry: PinPhotoEntry): number {
    return entry.id;
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    document.querySelector('main')?.classList.remove('page-fullscreen');
  }
}
