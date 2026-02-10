import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header" [class.page-header--flex]="showBackButton || hasAction">
      <div>
        <button class="btn-back" *ngIf="showBackButton" (click)="back.emit()">
          <i class="fas fa-arrow-left"></i>
          {{ 'COMMON.BACK' | translate }}
        </button>
        <h1 class="page-header__title">{{ title }}</h1>
        <p class="page-header__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content>
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showBackButton = false;
  @Input() hasAction = false;
  @Output() back = new EventEmitter<void>();
}
