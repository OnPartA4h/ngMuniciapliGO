import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { StatusOption, CategoryOption } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { WhiteService } from '../../services/white-service';
import { UserService } from '../../services/user-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [CommonModule, DaysAgoPipe, FormsModule],
})
export class ReportDetails implements OnInit {
  problem: any = null;
  isLoading = true;
  categories = signal<CategoryOption[]>([]);
  statuses = signal<StatusOption[]>([]);
  photoIndex = 0;
  colBleus: any[] = [];
  search = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private whiteService: WhiteService,
    private userService: UserService
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
          this.photoIndex = 0;
        } catch (error) {
          console.error('Error loading problem:', error);
        }
      }
      this.isLoading = false;
    });
  }

  async acceptProblem() {
    try {
      await this.whiteService.acceptProblem(this.problem.id);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }

  async refuseProblem() {
    try {
      this.whiteService.refuseProblem(this.problem.id);
      this.router.navigate(['/manage-reports']);
    } catch (err) {
      console.error(err);
    }
  }

  async assignCitoyen() {
    try {
      this.whiteService.assignProblemCitoyen(this.problem.id);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }

  async assignColBleu(colBleuId: string) {
    try {
      this.whiteService.assignProblemColbleu(this.problem.id, colBleuId);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }

  getStatusLabel(statusKey: number): string {
    const status = this.statuses()[statusKey];
    return status ? status.label : statusKey.toString();
  }

  getCategoryLabel(categoryKey: number): string {
    const category = this.categories()[categoryKey];
    return category ? category.label : categoryKey.toString();
  }

  prevPhoto() {
    if (!this.problem?.photos?.length) return;
    this.photoIndex = (this.photoIndex - 1 + this.problem.photos.length) % this.problem.photos.length;
  }

  nextPhoto() {
    if (!this.problem?.photos?.length) return;
    this.photoIndex = (this.photoIndex + 1) % this.problem.photos.length;
  }

  async getColBleus() {
    if (this.search == "")
      this.colBleus = [];
    else
      this.colBleus = await this.userService.getColBleus(this.search);
  }
}
