import { Component, Input } from '@angular/core';
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
  @Input() chartType: ChartType = 'line';
  @Input() datasets!: ChartData;

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
    plugins: {
      title: {
        display: true,
        text: 'Évolution des signalements et résolutions',
        font: { size: 18 },
        color: '#444',
        padding: { top: 10, bottom: 20 }
      }
    }
  };
}
