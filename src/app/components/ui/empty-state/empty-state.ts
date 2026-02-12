import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <i [class]="iconClass() + ' empty-state__icon'"></i>
      <h3 class="empty-state__title">{{ title() }}</h3>
      @if (description()) {
        <p class="empty-state__description">{{ description() }}</p>
      }
    </div>
  `
})
export class EmptyStateComponent {
  readonly iconClass = input('fas fa-inbox');
  readonly title = input('');
  readonly description = input('');
}
