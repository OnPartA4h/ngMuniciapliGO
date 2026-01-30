import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { StatusOption, CategoryOption } from '../../models/problem';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [CommonModule],
})
export class ReportDetails implements OnInit {
  problem: any = null;
  isLoading = true;
  categories: CategoryOption[] = [];
  statuses: StatusOption[] = [];

  constructor(
    private route: ActivatedRoute,
    private generalService: GeneralService,
    private languageService: LanguageService
  ) {}

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
      this.categories = await this.generalService.getCategories(lang);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadStatuses() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.statuses = await this.generalService.getStatuses(lang);
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

  getStatusLabel(statusKey: string): string {
    const status = this.statuses.find(s => s.key === statusKey);
    return status ? status.label : statusKey;
  }

  getCategoryLabel(categoryKey: string): string {
    const category = this.categories.find(c => c.key === categoryKey);
    return category ? category.label : categoryKey;
  }
}
