import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="loading-state">
      @if (useIcon()) {
        <i class="fas fa-spinner fa-spin loading-state__icon"></i>
      } @else {
        <div class="spinner"></div>
      }
      <p class="loading-state__text">{{ message() || ('COMMON.LOADING' | translate) }}</p>
    </div>
  `
})
export class LoadingSpinnerComponent {
  readonly message = input('');
  readonly useIcon = input(true);
}
