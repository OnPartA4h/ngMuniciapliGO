import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-details',
  templateUrl: './report-details.html',
  styleUrl: './report-details.css',
  imports: [CommonModule],
})
export class ReportDetails {
  problem: any = null;
  isLoading = true;

  constructor(private route: ActivatedRoute, private api: ApiService) {
    this.route.params.subscribe(async params => {
      if (params['id']) {
        this.problem = await this.api.getProblem(params['id']);
      }
      this.isLoading = false;
    });
  }
}
