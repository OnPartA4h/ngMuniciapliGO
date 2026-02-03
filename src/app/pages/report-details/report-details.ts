import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { StatusOption, CategoryOption, AssigneAOption } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { WhiteService } from '../../services/white-service';
import { UserService } from '../../services/user-service';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [CommonModule, DaysAgoPipe, FormsModule, TranslateModule],
})
export class ReportDetails implements OnInit {
  problem: any = null;
  isLoading = true;
  photoIndex = signal<number>(0);
  colBleus: any[] = [];
  search = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public generalService: GeneralService,
    private languageService: LanguageService,
    private whiteService: WhiteService,
    private userService: UserService,
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses(),
      this.generalService.loadAssigneA(),
      this.loadProblem()
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.generalService.loadCategories();
      this.generalService.loadStatuses();
      this.generalService.loadAssigneA();
    });
  }

  async loadProblem() {
    this.route.params.subscribe(async params => {
      if (params['id']) {
        try {
          this.problem = await this.whiteService.getProblem(params['id']);
          this.photoIndex.set(0);
          console.log(this.problem);
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

  prevPhoto() {
    if (!this.problem?.photos?.length) return;
    this.photoIndex.set((this.photoIndex() - 1 + this.problem.photos.length) % this.problem.photos.length);
  }

  nextPhoto() {
    if (!this.problem?.photos?.length) return;
    this.photoIndex.set((this.photoIndex() + 1) % this.problem.photos.length);
  }

  async getColBleus() {
    if (this.search == "")
      this.colBleus = [];
    else
      this.colBleus = await this.userService.getColBleus(this.search);
  }
}
