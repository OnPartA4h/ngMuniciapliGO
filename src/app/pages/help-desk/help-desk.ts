import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PageHeaderComponent } from '../../components/ui/page-header/page-header';
import { ToastService } from '../../components/ui';
import { SupportService } from '../../services/support-service';
import { Problem } from '../../models/problem';
import { Pagination } from '../../models/pagination';
import { ReportListComponent } from '../../components/tables/report-list/report-list';
import { GeneralService } from '../../services/general-service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { User } from '../../models/user';
import { PhoneNumberPipe } from '../../pipes/phone-number-pipe';
import { PhoneCall } from '../../models/phoneCall';
import { DatePipe } from '@angular/common';
import { DurationPipe } from '../../pipes/duration.pipe';
import { RouterLink } from "@angular/router";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CallHubService } from '../../services/call-hub.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-help-desk',
  standalone: true,
  imports: [PageHeaderComponent, ReportListComponent, FormsModule, PhoneNumberPipe, DatePipe, DurationPipe, RouterLink, TranslateModule],
  templateUrl: './help-desk.html',
  styleUrl: './help-desk.css',
})
export class HelpDesk implements OnInit, OnDestroy {
  supportService = inject(SupportService)
  generalService = inject(GeneralService);
  userService = inject(UserService)
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private callHubService = inject(CallHubService);

  problems = signal<Problem[]>([])
  phoneCall = signal<PhoneCall | null>(null)
  pagination: Pagination | null = null
  supportAgent: User | null = null
  client: User | null = null

  currentSearch: string | null = null;
  loading = true;
  userSearch: string = '';

  private subscriptions: Subscription[] = [];

  async ngOnInit() {
    this.loading = true
    this.supportAgent = await this.userService.getProfile()
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses(),
      this.generalService.loadAssigneA(),
      this.getPhoneCall(),
      this.getProblems(),
    ]);
    this.loading = false;

    // S'abonner aux événements SignalR du hub d'appels
    this.subscriptions.push(
      this.callHubService.callReceived$.subscribe((call: PhoneCall) => {
        // Nouvel appel reçu : l'afficher s'il n'y a pas d'appel en cours
        if (!this.phoneCall()) {
          this.phoneCall.set(call);
          this.client = call.client ?? null;
          this.toast.success(this.translate.instant('HELP_DESK.NEW_CALL_RECEIVED'));
        }
      }),

      this.callHubService.callUpdated$.subscribe((call: PhoneCall) => {
        // Un appel a été mis à jour (ex: utilisateur ajouté)
        if (this.phoneCall()?.id === call.id) {
          this.phoneCall.set(call);
          this.client = call.client ?? null;
        }
      }),

      this.callHubService.callEnded$.subscribe((callId: number) => {
        // Un appel s'est terminé
        if (this.phoneCall()?.id === callId) {
          this.phoneCall.set(null);
          this.client = null;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  async getProblems(page: number = 1) {
    const params: any = { page };

    if (this.currentSearch && this.currentSearch.trim() !== '') {
      params.search = this.currentSearch.trim();
    }

    let x: any = await this.supportService.getProblems(params)

    this.pagination = x.pagination
    this.problems.set(x.items);
  }

  async getPhoneCall() {
    try {
      const call = await this.supportService.getPhoneCall();
      this.phoneCall.set(call);
      this.client = call?.client ?? null;
    } catch {
      this.phoneCall.set(null);
      this.client = null;
    }
  }

  async onPageChange(page: number) {
    await this.getProblems(page);
  }

  async endCall() {
    try {
      await this.supportService.endCall(this.phoneCall()!.id)
      this.phoneCall.set(null)
      this.client = null;
      this.toast.success(this.translate.instant('HELP_DESK.END_CALL_SUCCESS'));
    } catch (error) {
      console.error('Error ending call:', error);
      this.toast.error(this.translate.instant('HELP_DESK.END_CALL_ERROR'));
    }
  }

  async addUserToCall() {
    try {
      let newCall = await this.supportService.addUserToCall(this.phoneCall()!.id, this.userSearch)
      this.phoneCall.set(newCall)
      this.client = this.phoneCall()!.client
      this.toast.success(this.translate.instant('HELP_DESK.ADD_USER_SUCCESS'));
    } catch {
      this.toast.error(this.translate.instant('HELP_DESK.ADD_USER_ERROR'));
    }

    this.userSearch = '';
  }
}
