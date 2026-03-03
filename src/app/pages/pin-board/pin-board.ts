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
    { url: '/assets/images/board_page/equipe1.jpg',    text: 'Les membres de l\'équipe 3 debout🧍' },
    { url: '/assets/images/board_page/equipe2.jpg',    text: 'Les membres de l\'équipe 3 assis 🪑' },
    { url: '/assets/images/board_page/photos_prof.jpg',    text: 'Le roi et ses sujets 🌱👑' },
    { url: '/assets/images/board_page/tableau_blanc.jpg',    text: 'Architecture et planification de projet ✏️' },
    { url: '/assets/images/board_page/gh_team.png',    text: 'Notre philosophie d\'équipe 💭' },
    { url: '/assets/images/board_page/haversine.png',    text: 'Une partie intégrante de notre projet 🧠' },
    { url: '/assets/images/board_page/time_cube.png',    text: 'Les 4 coins du monde 🌍' },
    { url: '/assets/images/board_page/refactor.png',    text: '"Bro I swear just one more refactor"' },
    { url: '/assets/images/board_page/git_force.png',    text: 'git push origin main --force' },
    { url: '/assets/images/board_page/quit_job.png',    text: '"Je pars live sinon il y aura trop de traffic"' },
    { url: '/assets/images/board_page/guild_wars.png',    text: '250 000 kills (Ultimate Dominator)' },
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
    const padding = 40;

    // Usable area — the full board minus one card width/height and padding on each side
    const areaW = boardW - padding * 2;
    const areaH = boardH - padding * 2;

    // Find grid dimensions (cols × rows) closest to screen aspect ratio
    const aspect = areaW / areaH;
    const cols   = Math.max(1, Math.round(Math.sqrt(n * aspect)));
    const rows   = Math.max(1, Math.ceil(n / cols));

    const cellW  = areaW / cols;
    const cellH  = areaH / rows;

    // Jitter: cards can wander up to 30% of cell size from cell center
    const jitterX = cellW * 0.30;
    const jitterY = cellH * 0.30;

    // Build shuffled grid positions (Fisher-Yates) so cards are spread over whole board
    const gridPositions: Array<{ col: number; row: number }> = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        gridPositions.push({ col, row });
      }
    }
    for (let i = gridPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
    }

    const shuffled = [...this.photos].sort(() => Math.random() - 0.5);

    this.entries = shuffled.map((photo, i) => {
      const gridPos = gridPositions[i] ?? { col: 0, row: 0 };

      const cellCenterX = padding + gridPos.col * cellW + cellW / 2;
      const cellCenterY = padding + gridPos.row * cellH + cellH / 2;

      const x = Math.max(padding, Math.min(boardW - cardW - padding,
        cellCenterX - cardW / 2 + (Math.random() - 0.5) * 2 * jitterX));
      const y = Math.max(padding, Math.min(boardH - cardH - padding,
        cellCenterY - cardH / 2 + (Math.random() - 0.5) * 2 * jitterY));

      const rotation = (Math.random() - 0.5) * 22;

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
