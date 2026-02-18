import { Component, inject } from '@angular/core';
import { Chart } from '../../components/chart/chart';
import { ChartData, ChartType } from 'chart.js';
import { TranslateModule } from '@ngx-translate/core';
import { StatBox } from '../../components/stat-box/stat-box';
import { GeneralService } from '../../services/general-service';
import { GraphDTO } from '../../models/problem';

@Component({
  selector: 'app-home',
  imports: [Chart, TranslateModule, StatBox],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  generalService = inject(GeneralService);
  stats: any;
  datasets!: ChartData<'line', { x: number; y: number }[]>;

  async ngOnInit() {
    await Promise.all([
      this.stats = await this.generalService.getStats()
    ]);

    const graph: GraphDTO[] = this.stats.graph;

    this.datasets = {
      datasets: [
        {
          label: 'Reported',
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.reportedCount
          })),
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        },
        {
          label: 'Solved',
          data: graph.map(d => ({
            x: new Date(d.date).getTime(),
            y: d.solvedCount
          })),
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }
      ]
    };
  }
}
