import { Component, inject } from '@angular/core';
import { Chart } from '../../components/chart/chart';
import { ChartData, ChartType } from 'chart.js';
import { TranslateModule } from '@ngx-translate/core';
import { StatBox } from '../../components/stat-box/stat-box';
import { GeneralService } from '../../services/general-service';
import { GraphDTO } from '../../models/problem';
import { LanguageService } from '../../services/language-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [Chart, TranslateModule, StatBox, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  generalService = inject(GeneralService);
  languageService = inject(LanguageService);
  datasets!: ChartData<'line', { x: number; y: number }[]>;
  currentTimeSpan: number = 0;
  stats: any;

  async ngOnInit() {
    await Promise.all([
      this.generalService.loadTimeSpans()
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.generalService.loadTimeSpans();
    });
  }

  async getStats() {
    this.stats = await this.generalService.getStats(this.currentTimeSpan)

    const graph: GraphDTO[] = this.stats.graph;

    this.datasets = {
      datasets: [
        {
          label: 'Reported',
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.reportedCount
          })),
          backgroundColor: 'rgba(44, 157, 233, 0.8)',
          borderColor: 'rgba(54, 162, 235, 0.3)'
        },
        {
          label: 'Solved',
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
}
