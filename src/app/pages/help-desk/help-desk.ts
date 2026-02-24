import { Component, inject, OnInit, signal } from '@angular/core';
import { PageHeaderComponent } from '../../components/ui/page-header/page-header';
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

@Component({
  selector: 'app-help-desk',
  standalone: true,
  imports: [PageHeaderComponent, ReportListComponent, FormsModule, PhoneNumberPipe, DatePipe, DurationPipe, RouterLink],
  templateUrl: './help-desk.html',
  styleUrl: './help-desk.css',
})
export class HelpDesk implements OnInit{
  supportService = inject(SupportService)
  generalService = inject(GeneralService);
  userService = inject(UserService)

  problems = signal<Problem[]>([])
  phoneCall = signal<PhoneCall | null>(null)
  pagination: Pagination | null = null
  supportAgent: User | null = null
  client: User | null = null
  

  currentSearch: string | null = null;
  loading = true;

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
    this.loading = false
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
    this.phoneCall.set(await this.supportService.getPhoneCall())
    this.client = this.phoneCall()!.client
  }

  async onPageChange(page: number) {
    await this.getProblems(page);
  }

  agent = {
    firstName: 'Marc',
    lastName: 'Bouchard',
  };
  call = {
    startTime: new Date(),
    duration: 120, // secondes
    status: 'En cours',
  };
  search = '';
}
