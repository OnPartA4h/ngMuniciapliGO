import { Component } from '@angular/core';
import { Chart } from '../../components/chart/chart';
import { ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-home',
  imports: [Chart],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  datasets1: ChartData<'bar', { key: string, value: number }[]> = {
    datasets: [{
      data: [{ key: 'A', value: 10 }, { key: 'B', value: 20 }],
      parsing: { xAxisKey: 'key', yAxisKey: 'value' }
    }]
  };
  datasets2: ChartData<'bar', { key: string, value: number }[]> = {
    datasets: [{
      data: [{ key: 'C', value: 5 }, { key: 'D', value: 15 }],
      parsing: { xAxisKey: 'key', yAxisKey: 'value' }
    }]
  };
  datasets3: ChartData<'bar', { key: string, value: number }[]> = {
    datasets: [{
      data: [{ key: 'E', value: 8 }, { key: 'F', value: 12 }],
      parsing: { xAxisKey: 'key', yAxisKey: 'value' }
    }]
  };
  datasets4: ChartData<'bar', { key: string, value: number }[]> = {
    datasets: [{
      data: [{ key: 'G', value: 18 }, { key: 'H', value: 7 }],
      parsing: { xAxisKey: 'key', yAxisKey: 'value' }
    }]
  };
}
