import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin loading-state__icon" *ngIf="useIcon; else spinnerTpl"></i>
      <ng-template #spinnerTpl>
        <div class="spinner"></div>
      </ng-template>
      <p class="loading-state__text">{{ message || ('COMMON.LOADING' | translate) }}</p>
    </div>
  `
})
export class LoadingSpinnerComponent {
  @Input() message = '';
  @Input() useIcon = true;
}
