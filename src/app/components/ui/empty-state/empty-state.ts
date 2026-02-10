import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <i [class]="iconClass + ' empty-state__icon'"></i>
      <h3 class="empty-state__title">{{ title }}</h3>
      <p class="empty-state__description" *ngIf="description">{{ description }}</p>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() iconClass = 'fas fa-inbox';
  @Input() title = '';
  @Input() description = '';
}
