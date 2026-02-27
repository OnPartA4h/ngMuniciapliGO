import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-chart',
  imports: [BaseChartDirective, FormsModule],
  templateUrl: './chart.html',
  styleUrl: './chart.css',
})

export class Chart {
  readonly chartType = input<ChartType>('line');
  readonly datasets = input.required<ChartData>();

  options: ChartOptions<ChartType> = {
    responsive: true,
    parsing: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day'
        }
      },
      y: {
        beginAtZero: true
      }
    },
  };
}
