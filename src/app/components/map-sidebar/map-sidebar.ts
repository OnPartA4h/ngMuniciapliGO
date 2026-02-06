import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Problem } from '../../models/problem';
import { GeneralService } from '../../services/general-service';

@Component({
  selector: 'app-map-sidebar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './map-sidebar.html',
  styleUrl: './map-sidebar.css',
})
export class MapSidebar implements OnInit {
  @Input() problem: Problem | null = null;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  constructor(public generalService: GeneralService) {}

  async ngOnInit() {
    // Load categories and statuses when component initializes
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses()
    ]);
  }

  closeSidebar() {
    this.close.emit();
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
