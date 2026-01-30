import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { StatusOption, CategoryOption } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [CommonModule, DaysAgoPipe],
})
export class ReportDetails implements OnInit {
  problem: any = null;
  isLoading = true;
  categories = signal<CategoryOption[]>([]);
  statuses = signal<StatusOption[]>([]);

  constructor(
    private route: ActivatedRoute,
    private generalService: GeneralService,
    private languageService: LanguageService
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadCategories(),
      this.loadStatuses(),
      this.loadProblem()
    ]);
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

  async loadProblem() {
    this.route.params.subscribe(async params => {
      if (params['id']) {
        try {
          this.problem = await this.generalService.getProblem(params['id']);
        } catch (error) {
          console.error('Error loading problem:', error);
        }
      }
      this.isLoading = false;
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
