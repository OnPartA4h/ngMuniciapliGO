import { Component, Input, Output, EventEmitter } from '@angular/core';
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
export class MapSidebar {
  @Input() problem: Problem | null = null;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  constructor(public generalService: GeneralService) {}

  closeSidebar() {
    this.close.emit();
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'EnAttente': 'status-pending',
      'EnCours': 'status-in-progress',
      'Resolu': 'status-resolved',
      'Rejete': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
  }

  getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'Nid de poule': 'fa-road',
      'Eclairage': 'fa-lightbulb',
      'Graffiti': 'fa-spray-can',
      'Dechets': 'fa-trash',
      'Signalisation': 'fa-sign',
      'Autre': 'fa-question-circle'
    };
    return iconMap[category] || 'fa-exclamation-triangle';
  }
}
