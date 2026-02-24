import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { Chart } from '../../components/chart/chart';
import { ChartData, ChartType } from 'chart.js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StatBox } from '../../components/stat-box/stat-box';
import { GeneralService } from '../../services/general-service';
import { GraphAverageDTO, GraphDTO } from '../../models/problem';
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

  datasets = signal<ChartData<'line', { x: number; y: number }[]>>(undefined as any);
  datasetsResolution = signal<ChartData<'bar', { x: number; y: number }[]>>(undefined as any);
  currentTimeSpan = signal<number>(0);
  currentAssigneA = signal<number>(0);
  currentDistrict = signal<number | null>(null);
  currentCategory = signal<number | null>(null);
  currentResponsable = signal<string | null>(null);
  rangeDates = signal<Date[] | undefined>(undefined);
  stats = signal<any>(null);
  search = signal<string>("");
  showSearch = signal<boolean>(false);
  colBleus = signal<any[]>([]);
  colBleuIndex = signal<number>(0);

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
    if (this.search() === "") {
      this.colBleus.set([]);
      this.currentResponsable.set("")
    }
    else {
      const result = await this.userService.getColBleus(this.search());
      this.colBleus.set(result);
    }
  }

  async selectColBleu(colBleu: any) {
    this.search.set(colBleu.label);
    this.showSearch.set(false);
    this.currentResponsable.set(colBleu.key);
    await this.getStats();
  }

  async clearColBleu() {
    if (this.search() !== "")
      return;
    this.currentResponsable.set(null);
    await this.getStats();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.combobox')) {
      this.showSearch.set(false);
    }
  }

  async getStats() {
    let filters: StatsFilterDTO = {} as StatsFilterDTO;

    if (this.rangeDates() !== undefined) {
      filters.minDate = this.rangeDates()![0];
      filters.maxDate = this.rangeDates()![1];
    }

    filters.assigneA = this.currentAssigneA();
    filters.responsableId = this.currentResponsable();
    filters.categorieId = this.currentCategory();
    filters.districtId = this.currentDistrict();

    const statsResult = await this.generalService.getStats(filters);
    console.log(statsResult);
    this.stats.set(statsResult);

    this.setGraph(statsResult.graph);
    this.setMoyenne(statsResult.graphAverage);
  }

  setGraph(graph: GraphDTO[]) {
    this.datasets.set({
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
    });
  }

  setMoyenne(graph: GraphAverageDTO[]) {
    this.datasetsResolution.set({
      datasets: [
        {
          label: this.translate.instant("DASHBOARD.ASS"),
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.assignation
          })),
          backgroundColor: 'rgba(128, 72, 233, 0.8)',
          borderColor: 'rgba(94, 37, 199, 0.3)'
        },
        {
          label: this.translate.instant("DASHBOARD.PRISE"),
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.priseEnCharge
          })),
          backgroundColor: 'rgba(44, 157, 233, 0.8)',
          borderColor: 'rgba(44, 143, 209, 0.3)'
        },
        {
          label: this.translate.instant("DASHBOARD.RES"),
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.resolution
          })),
          backgroundColor: 'rgba(35, 189, 94, 0.8)',
          borderColor: 'rgba(35, 189, 94, 0.3)'
        }
      ]
    });
  }

  updateDateRange(x: any) {
    this.rangeDates.set(x);
    this.getStats();
  }

  getMinDate(): Date {
    const now = new Date();
    switch (this.currentTimeSpan()) {
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
