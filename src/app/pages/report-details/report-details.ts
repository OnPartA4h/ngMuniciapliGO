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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [CommonModule, DaysAgoPipe, FormsModule, TranslateModule, MatSnackBarModule],
})
export class ReportDetails implements OnInit {
  problem: any = null;
  isLoading = true;
  photoIndex = signal<number>(0);
  resolutionPhotoIndex = signal<number>(0);
  showPhotoModal = signal<boolean>(false);
  colBleus: any[] = [];
  search = "";
  message_refus = ""

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public generalService: GeneralService,
    private languageService: LanguageService,
    private whiteService: WhiteService,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private translate: TranslateService
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
      this.problem = await this.whiteService.acceptProblem(this.problem.id);
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.ACCEPTER_SUCCESS'), 'OK', { duration: 3000 });
    }
    catch (e) {
      this.snackbar.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
      console.error(e);
    }
  }

  async refuseProblem() {
    try {
      await this.whiteService.refuseProblem(this.problem.id);
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.REFUSER_SUCCESS'), 'OK', { duration: 3000 });
      this.router.navigate(['/manage-reports']);
    } catch (err) {
      this.snackbar.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
      console.error(err);
    }
  }

  async acceptFix() {
    try {
      await this.whiteService.acceptFix(this.problem.id);
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.ACCEPTER_FIX_SUCCESS'), 'OK', { duration: 3000 });
      this.router.navigate(['/manage-reports']);
    } catch (err) {
      this.snackbar.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
      console.error(err);
    }
  }

  async refuseFix() {
    try {
      await this.whiteService.refuseFix(this.problem.id, this.message_refus);
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.REFUSER_FIX_SUCCESS'), 'OK', { duration: 3000 });
      this.router.navigate(['/manage-reports']);
    } catch (err: any) {
      this.snackbar.open(err.error.errors.Reason[0], 'OK', { duration: 3000 });
      console.error(err);
    }
  }

  async assignCitoyen() {
    try {
      this.problem = await this.whiteService.assignProblemCitoyen(this.problem.id);
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.ASSIGN_SUCCESS_CITOYEN'), 'OK', { duration: 3000 });
    }
    catch (e) {
      this.snackbar.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
    }
  }

  async assignColBleu(colBleuId: string) {
    try {
      this.problem = await this.whiteService.assignProblemColbleu(this.problem.id, colBleuId);
      let name = this.problem?.responsable?.firstName + ' ' + this.problem?.responsable?.lastName;
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.ASSIGN_SUCCESS_COL_BLEU', { colbleu: name }), 'OK', { duration: 3000 });
    }
    catch (e) {
      this.snackbar.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
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

  selectPhoto(index: number) {
    if (!this.problem?.photos?.length) return;
    this.photoIndex.set(index);
  }

  async getColBleus() {
    if (this.search == "")
      this.colBleus = [];
    else
      this.colBleus = await this.userService.getColBleus(this.search);
  }

  openPhotoModal(index: number) {
    this.resolutionPhotoIndex.set(index);
    this.showPhotoModal.set(true);
  }

  closePhotoModal() {
    this.showPhotoModal.set(false);
  }

  nextResolutionPhoto() {
    if (!this.problem?.resolutionPhotos?.length) return;
    this.resolutionPhotoIndex.set((this.resolutionPhotoIndex() + 1) % this.problem.resolutionPhotos.length);
  }

  prevResolutionPhoto() {
    if (!this.problem?.resolutionPhotos?.length) return;
    this.resolutionPhotoIndex.set((this.resolutionPhotoIndex() - 1 + this.problem.resolutionPhotos.length) % this.problem.resolutionPhotos.length);
  }
}
