import { Component, inject, OnInit, signal } from '@angular/core';
import { PageHeaderComponent } from '../../components/ui/page-header/page-header';
import { SupportService } from '../../services/support-service';
import { Problem } from '../../models/problem';
import { Pagination } from '../../models/pagination';
import { ReportListComponent } from '../../components/tables/report-list/report-list';
import { GeneralService } from '../../services/general-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-help-desk',
  standalone: true,
  imports: [PageHeaderComponent, ReportListComponent, FormsModule],
  templateUrl: './help-desk.html',
  styleUrl: './help-desk.css',
})
export class HelpDesk implements OnInit{
  supportService = inject(SupportService)
  generalService = inject(GeneralService);

  problems = signal<Problem[]>([])
  pagination: Pagination | null = null

  currentSearch: string | null = null;
  loading = true;

  async ngOnInit() {
    this.loading = true
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses(),
      this.generalService.loadAssigneA(),
      this.getProblems()
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

  async onPageChange(page: number) {
    await this.getProblems(page);
  }

  user = {
    firstName: 'Sophie',
    lastName: 'Lavoie',
    email: 'sophie.lavoie@email.com',
    phone: '514-555-1234',
    address: '123 rue Sherbrooke, Montréal',
    profilePictureUrl: 'https://i.pravatar.cc/72?img=5',
  };
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
