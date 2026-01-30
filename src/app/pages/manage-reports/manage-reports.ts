import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { Problem, StatusOption, CategoryOption } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { StatutProbleme } from '../../enums/statut-probleme';
import { CategorieProbleme } from '../../enums/categorie-probleme';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';

@Component({
  selector: 'app-manage-reports',
  imports: [RouterLink, CommonModule, DaysAgoPipe, TranslateModule],
  templateUrl: './manage-reports.html',
  styleUrl: './manage-reports.css',
})
export class ManageReports implements OnInit {
  StatutProbleme = StatutProbleme;
  CategorieProbleme = CategorieProbleme

  loading = true;

  categories = signal<CategoryOption[]>([]);
  statuses = signal<StatusOption[]>([]);

  problems: Problem[] = []

  constructor(
    public whiteService: WhiteService,
    private generalService: GeneralService,
    private languageService: LanguageService
  ) { }

  async ngOnInit() {
    this.loading = true;
    await Promise.all([
      this.loadCategories(),
      this.loadStatuses(),
      this.getAllReports()
    ]);
    this.loading = false;
  }

  async loadCategories() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.categories.set(await this.generalService.getCategories(lang));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadStatuses() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.statuses.set(await this.generalService.getStatuses(lang));
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }

  async getAllReports() {
    this.problems = await this.whiteService.getAllProblems()

    this.problems.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return dateA - dateB;
    });
  }

  getStatusLabel(statusKey: number): string {
    const status = this.statuses()[statusKey];
    return status ? status.label : statusKey.toString();
  }

  getCategoryLabel(categoryKey: number): string {
    const category = this.categories()[categoryKey];
    return category ? category.label : categoryKey.toString();
  }
}
