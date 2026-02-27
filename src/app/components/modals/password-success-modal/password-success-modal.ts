import { Component, inject, input, output } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../ui/toast/toast.service';

@Component({
  selector: 'app-password-success-modal',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './password-success-modal.html',
  styleUrl: './password-success-modal.css',
})
export class PasswordSuccessModalComponent {
  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);

  readonly generatedPassword = input<string | null>(null);
  readonly isOpen = input(false);
  readonly close = output<void>();

  async copyPassword() {
    const generatedPassword = this.generatedPassword();
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        this.toastService.success(this.translateService.instant('CREATE_USER.PASSWORD_COPIED'));
      } catch (err) {
        console.error('Failed to copy password:', err);
        this.toastService.error(this.translateService.instant('COMMON.ERROR'));
      }
    }
  }

  closeModal() {
    this.close.emit(undefined);
  }
}
