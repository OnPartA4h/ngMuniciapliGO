import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-chart',
  imports: [BaseChartDirective, FormsModule],
  templateUrl: './chart.html',
  styleUrl: './chart.css',
})

export class Chart {
  @Input() chartType: ChartType = 'bar';
  @Input() datasets!: ChartData<'bar', { key: string, value: number }[]>;
}
