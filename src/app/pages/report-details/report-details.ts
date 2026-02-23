import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { StatusOption, CategoryOption, AssigneAOption, Problem } from '../../models/problem';

import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { WhiteService } from '../../services/white-service';
import { UserService } from '../../services/user-service';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '../../services/notification.service';
import { ColBleuOption } from '../../models/user';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [DaysAgoPipe, FormsModule, TranslateModule, MatSnackBarModule, RouterLink],
})
export class ReportDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private whiteService = inject(WhiteService);
  private userService = inject(UserService);
  private snackbar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private notifService = inject(NotificationService)

  problem: Problem | null = null;
  isLoading = true;
  photoIndex = signal<number>(0);
  resolutionPhotoIndex = signal<number>(0);
  showPhotoModal = signal<boolean>(false);
  colBleus: ColBleuOption[] = [];
  search = "";
  message_refus = ""
  isSubscribed = false;

  async ngOnInit() {
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses(),
      this.generalService.loadAssigneA(),
      this.loadProblem(),
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.generalService.loadCategories();
      this.generalService.loadStatuses();
      this.generalService.loadAssigneA();
    });

  }

  async loadProblem() {
    const params = await firstValueFrom(this.route.params);
    if (params['id']) {
      try {
        this.problem = await this.whiteService.getProblem(params['id']);
        this.photoIndex.set(0);
        console.log(this.problem);

        this.isSubscribed = await this.notifService.isSubscribed(params['id']);
      } catch (error) {
        console.error('Error loading problem:', error);
      }
    }
    this.isLoading = false;
  }

  async acceptProblem() {
    if (this.problem == null) {
      return;
    }

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
    if (this.problem == null) {
      return;
    }

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
    if (this.problem == null) {
      return;
    }

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
    if (this.problem == null) {
      return;
    }

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
    if (this.problem == null) {
      return;
    }

    try {
      this.problem = await this.whiteService.assignProblemCitoyen(this.problem.id);
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.ASSIGN_SUCCESS_CITOYEN'), 'OK', { duration: 3000 });
    }
    catch (e) {
      this.snackbar.open(this.translate.instant('COMMON.ERROR'), 'OK', { duration: 3000 });
    }
  }

  async assignColBleu(colBleuId: string) {
    if (this.problem == null) {
      return;
    }

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

  async toggleSubscription() {
    if (this.problem == null) {
      return;
    }

    if (!this.isSubscribed) {
      await this.notifService.subscribe(this.problem.id)
      this.isSubscribed = true
      return
    }

    try {
      await this.notifService.unsubscribe(this.problem.id)
      this.isSubscribed = false
    } catch {
      this.snackbar.open(this.translate.instant('MANAGE_REPORTS.UNSUBSCRIBE_ERROR'), 'OK', { duration: 2000 })
    }
  }
}
