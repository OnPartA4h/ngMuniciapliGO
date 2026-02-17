import { Component, inject } from '@angular/core';
import { Chart } from '../../components/chart/chart';
import { ChartData, ChartType } from 'chart.js';
import { TranslateModule } from '@ngx-translate/core';
import { StatBox } from '../../components/stat-box/stat-box';
import { GeneralService } from '../../services/general-service';

@Component({
  selector: 'app-home',
  imports: [Chart, TranslateModule, StatBox],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  generalService = inject(GeneralService);
  stats: any

  async ngOnInit() {
    await Promise.all([
      this.stats = await this.generalService.getStats()
    ]);
    console.log(this.stats);
  }

  datasets: ChartData<'bar', number[]> = {
    labels: ['A', 'B'],
    datasets: [
      {
        label: 'Reported',
        data: [10, 20],
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      },
      {
        label: 'Solved',
        data: [5, 15],
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }
    ]
  };
}
