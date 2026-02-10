import { Component, Output, EventEmitter, inject, input } from '@angular/core';

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
  generalService = inject(GeneralService);

  readonly problems = input.required<Problem[]>();
  readonly pagination = input<Pagination | null>(null);
  readonly loading = input(false);
  @Output() pageChange = new EventEmitter<number>();

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }
}
