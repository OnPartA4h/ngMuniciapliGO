import { Component, Output, EventEmitter, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (totalPages() > 1) {
      <div class="pagination">
        <button class="pagination-btn" (click)="onPrevious()" [disabled]="currentPage() === 1">
          <i class="fas fa-chevron-left"></i>
          {{ 'COMMON.PREVIOUS' | translate }}
        </button>
        <span class="pagination__info">
          {{ 'COMMON.PAGE' | translate }} {{ currentPage() }} / {{ totalPages() }}
        </span>
        <button class="pagination-btn" (click)="onNext()" [disabled]="currentPage() === totalPages()">
          {{ 'COMMON.NEXT' | translate }}
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    }
  `
})
export class PaginationComponent {
  readonly currentPage = input(1);
  readonly totalPages = input(1);
  @Output() pageChange = new EventEmitter<number>();

  onPrevious(): void {
    if (this.currentPage() > 1) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  onNext(): void {
    if (this.currentPage() < this.totalPages()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }
}
