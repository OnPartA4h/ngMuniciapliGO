import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <i [class]="iconClass + ' empty-state__icon'"></i>
      <h3 class="empty-state__title">{{ title }}</h3>
      @if (description) {
        <p class="empty-state__description">{{ description }}</p>
      }
    </div>
  `
})
export class EmptyStateComponent {
  @Input() iconClass = 'fas fa-inbox';
  @Input() title = '';
  @Input() description = '';
}
