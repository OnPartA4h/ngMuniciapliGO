import { Component, Input, Output, EventEmitter } from '@angular/core';

import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Problem } from '../../../models/problem';
import { GeneralService } from '../../../services/general-service';
import { DaysAgoPipe } from '../../../pipes/days-ago-pipe';
import { EmptyStateComponent, PaginationComponent } from '../../ui';
import { Pagination } from '../../../models/pagination';

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, DaysAgoPipe, EmptyStateComponent, PaginationComponent],
  templateUrl: './report-list.html',
  styleUrl: './report-list.css',
})
export class ReportListComponent {
  @Input({ required: true }) problems: Problem[] = [];
  @Input() pagination: Pagination | null = null;
  @Input() loading = false;
  @Output() pageChange = new EventEmitter<number>();

  constructor(public generalService: GeneralService) {}

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }
}
