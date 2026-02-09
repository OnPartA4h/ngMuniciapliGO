import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-map-config-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './map-config-modal.html',
  styleUrl: './map-config-modal.css',
})
export class MapConfigModal {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<any>();

  // Hardcoded filter values
  radius: number = 5;
  selectedStatuses: string[] = ['pending', 'in-progress'];
  selectedCategories: string[] = ['pothole', 'lighting'];
  dateFrom: string = '2024-01-01';
  dateTo: string = '2024-12-31';
  showUserLocation: boolean = true;
  clusterMarkers: boolean = true;

  // Hardcoded options
  statuses = [
    { id: 'pending', label: 'Pending', color: '#FEF3C7' },
    { id: 'in-progress', label: 'In Progress', color: '#DBEAFE' },
    { id: 'resolved', label: 'Resolved', color: '#D1FAE5' },
    { id: 'rejected', label: 'Rejected', color: '#FEE2E2' }
  ];

  categories = [
    { id: 'pothole', label: 'Pothole', icon: 'fa-road' },
    { id: 'lighting', label: 'Lighting', icon: 'fa-lightbulb' },
    { id: 'graffiti', label: 'Graffiti', icon: 'fa-spray-can' },
    { id: 'waste', label: 'Waste', icon: 'fa-trash' },
    { id: 'signage', label: 'Signage', icon: 'fa-sign' },
    { id: 'other', label: 'Other', icon: 'fa-question-circle' }
  ];

  closeModal() {
    this.close.emit();
  }

  applyFilters() {
    const config = {
      radius: this.radius,
      statuses: this.selectedStatuses,
      categories: this.selectedCategories,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      showUserLocation: this.showUserLocation,
      clusterMarkers: this.clusterMarkers
    };
    this.apply.emit(config);
    this.closeModal();
  }

  resetFilters() {
    this.radius = 5;
    this.selectedStatuses = ['pending', 'in-progress', 'resolved', 'rejected'];
    this.selectedCategories = ['pothole', 'lighting', 'graffiti', 'waste', 'signage', 'other'];
    this.dateFrom = '';
    this.dateTo = '';
    this.showUserLocation = true;
    this.clusterMarkers = true;
  }

  toggleStatus(statusId: string) {
    const index = this.selectedStatuses.indexOf(statusId);
    if (index > -1) {
      this.selectedStatuses.splice(index, 1);
    } else {
      this.selectedStatuses.push(statusId);
    }
  }

  toggleCategory(categoryId: string) {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(categoryId);
    }
  }

  isStatusSelected(statusId: string): boolean {
    return this.selectedStatuses.includes(statusId);
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategories.includes(categoryId);
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
