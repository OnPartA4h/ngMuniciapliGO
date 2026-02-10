import { Component, OnInit, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Problem } from '../../models/problem';
import { GeneralService } from '../../services/general-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-map-sidebar',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
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
    const statusLabel = this.generalService.getStatusLabel(statusKey);
    const statusMap: { [key: string]: string } = {
      'En attente': 'status-pending',
      'Pending': 'status-pending',
      'En cours': 'status-in-progress',
      'In Progress': 'status-in-progress',
      'Résolu': 'status-resolved',
      'Resolved': 'status-resolved',
      'Rejeté': 'status-rejected',
      'Rejected': 'status-rejected'
    };
    return statusMap[statusLabel] || 'status-pending';
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
