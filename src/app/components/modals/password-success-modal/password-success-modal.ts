import { Component, inject, input, output } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-password-success-modal',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './password-success-modal.html',
  styleUrl: './password-success-modal.css',
})
export class PasswordSuccessModalComponent {
  private translateService = inject(TranslateService);

  readonly generatedPassword = input<string | null>(null);
  readonly isOpen = input(false);
  readonly close = output<void>();

  async copyPassword() {
    const generatedPassword = this.generatedPassword();
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        alert(this.translateService.instant('CREATE_USER.PASSWORD_COPIED'));
      } catch (err) {
        console.error('Failed to copy password:', err);
      }
    }
  }

  closeModal() {
    this.close.emit(undefined);
  }
}
