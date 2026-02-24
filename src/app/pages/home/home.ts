import { Component, HostListener, inject } from '@angular/core';
import { Chart } from '../../components/chart/chart';
import { ChartData, ChartType } from 'chart.js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StatBox } from '../../components/stat-box/stat-box';
import { GeneralService } from '../../services/general-service';
import { GraphDTO } from '../../models/problem';
import { LanguageService } from '../../services/language-service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { StatsFilterDTO } from '../../models/statsFilterDTO';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-home',
  imports: [Chart, TranslateModule, StatBox, FormsModule, DatePickerModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  generalService = inject(GeneralService);
  languageService = inject(LanguageService);
  userService = inject(UserService);
  private translate = inject(TranslateService);

  datasets!: ChartData<'line', { x: number; y: number }[]>;
  currentTimeSpan: number = 0;
  currentAssigneA: number = 0;
  currentDistrict: number | null = null;
  currentCategory: number | null = null;
  currentResponsable: string | null = null;
  rangeDates: Date[] | undefined;
  stats: any;

  search: string = "";
  showSearch: boolean = false;
  colBleus: any[] = [];
  colBleuIndex: number = 0;

  async ngOnInit() {
    await Promise.all([
      this.generalService.loadTimeSpans(),
      this.generalService.loadAssigneA(),
      this.generalService.loadDistrictNames(),
      this.generalService.loadCategories(),
      this.getStats()
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.generalService.loadTimeSpans();
      this.generalService.loadAssigneA();
      this.generalService.loadCategories()
    });
  }

  async getColBleus() {
    if (this.search == "") {
      this.colBleus = [];
      this.currentResponsable = ""
    }
    else {
      this.colBleus = await this.userService.getColBleus(this.search);
    }
  }

  async selectColBleu(colBleu: any) {
    this.search = colBleu.label;
    this.showSearch = false;

    this.currentResponsable = colBleu.key;

    await this.getStats();
  }

  async clearColBleu() {
    if (this.search != "")
      return;
    this.currentResponsable = null;
    await this.getStats();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.combobox')) {
      this.showSearch = false;
    }
  }

  async getStats() {
    let filters: StatsFilterDTO = {} as StatsFilterDTO;

    filters.assigneA = this.currentAssigneA;
    filters.responsableId = this.currentResponsable;
    filters.minDate = this.getMinDate();
    filters.maxDate = null;
    filters.categorieId = this.currentCategory;
    filters.districtId = this.currentDistrict;

    this.stats = await this.generalService.getStats(filters);

    const graph: GraphDTO[] = this.stats.graph;

    this.datasets = {
      datasets: [
        {
          label: this.translate.instant("DASHBOARD.REPORTED"),
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.reportedCount
          })),
          backgroundColor: 'rgba(44, 157, 233, 0.8)',
          borderColor: 'rgba(54, 162, 235, 0.3)'
        },
        {
          label: this.translate.instant("DASHBOARD.SOLVED"),
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.solvedCount
          })),
          backgroundColor: 'rgba(35, 189, 94, 0.8)',
          borderColor: 'rgba(35, 189, 94, 0.3)'
        }
      ]
    };
  }

  getMinDate(): Date {
    const now = new Date();
    switch (this.currentTimeSpan) {
      case 0:
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 1:
        return new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
      case 2:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }
}
