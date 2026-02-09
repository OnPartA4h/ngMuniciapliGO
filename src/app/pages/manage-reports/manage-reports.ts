import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { Problem, StatusOption, CategoryOption } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { Pagination } from '../../models/pagination';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-reports',
  imports: [RouterLink, CommonModule, DaysAgoPipe, TranslateModule, FormsModule],
  templateUrl: './manage-reports.html',
  styleUrl: './manage-reports.css',
})
export class ManageReports implements OnInit {
  loading = true;

  categories = signal<CategoryOption[]>([]);
  statuses = signal<StatusOption[]>([]);

  currentCategory: number | null = null;
  currentStatus: number | null = null;
  currentAssigneA: number | null = null;
  currentSearch: string | null = null;

  problems: Problem[] = []
  pagination: Pagination | null = null

  constructor(
    public whiteService: WhiteService,
    public generalService: GeneralService,
    private languageService: LanguageService
  ) { }

  async ngOnInit() {
    this.loading = true;
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses(),
      this.generalService.loadAssigneA(),
      this.getAllReports()
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.generalService.loadCategories();
      this.generalService.loadStatuses();
      this.generalService.loadAssigneA();
    });
    this.loading = false;
  }

  async getAllReports(page: number = 1) {
    const params: any = { page };

    if (this.currentCategory != null && this.currentCategory != undefined) {
      params.categorie = this.currentCategory - 1;
    }
    if (this.currentStatus != null && this.currentStatus != undefined) {
      params.statut = this.currentStatus - 1;
    }
    if (this.currentAssigneA != null && this.currentAssigneA != undefined) {
      params.assignation = this.currentAssigneA - 1;
    }
    if (this.currentSearch && this.currentSearch.trim() !== '') {
      params.search = this.currentSearch.trim();
    }

    let x: any = await this.whiteService.getAllProblems(params);

    this.pagination = x.pagination
    this.problems = x.items;

    this.problems.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return dateA - dateB;
    });
  }

  async nextPage() {
    if (this.pagination && this.pagination.currentPage < this.pagination.totalPages)
      this.getAllReports(this.pagination?.currentPage + 1);
  }

  async prevPage() {
    if (this.pagination && this.pagination.currentPage > 1)
      this.getAllReports(this.pagination?.currentPage - 1);
  }
}
