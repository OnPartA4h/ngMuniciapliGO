import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="page-header" [class.page-header--flex]="showBackButton() || hasAction()">
      <div>
        @if (showBackButton()) {
          <button class="btn-back" (click)="back.emit()">
            <i class="fas fa-arrow-left"></i>
            {{ 'COMMON.BACK' | translate }}
          </button>
        }
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `
})
export class PageHeaderComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly showBackButton = input(false);
  readonly hasAction = input(false);
  readonly back = output<void>();
}
