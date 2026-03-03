import { Component, OnInit, inject, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Problem } from '../../models/problem';
import { GeneralService } from '../../services/general-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-map-sidebar',
  standalone: true,
  imports: [TranslateModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './map-sidebar.html',
  styleUrl: './map-sidebar.css',
})
export class MapSidebar implements OnInit {
  generalService = inject(GeneralService);

  readonly problem = input<Problem | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly close = output<void>();

  async ngOnInit() {
    // Load categories and statuses when component initializes
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses()
    ]);
  }

  closeSidebar() {
    this.close.emit(undefined);
  }

  getStatusClass(statusKey: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'status-pending',
      1: 'status-in-progress',
      2: 'status-resolved',
      3: 'status-rejected',
    };
    return statusMap[statusKey] ?? 'status-pending';
  }

  getCategoryIcon(categoryKey: number): string {
    const categoryLabel = this.generalService.getCategoryLabel(categoryKey);
    const iconMap: { [key: string]: string } = {
      'Nid de poule': 'fa-road',
      'Pothole': 'fa-road',
      'Éclairage': 'fa-lightbulb',
      'Lighting': 'fa-lightbulb',
      'Graffiti': 'fa-spray-can',
      'Déchets': 'fa-trash',
      'Waste': 'fa-trash',
      'Signalisation': 'fa-sign',
      'Signage': 'fa-sign',
      'Autre': 'fa-question-circle',
      'Other': 'fa-question-circle'
    };
    return iconMap[categoryLabel] || 'fa-exclamation-triangle';
  }
}
