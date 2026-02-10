import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

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

  @Input() generatedPassword: string | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  async copyPassword() {
    if (this.generatedPassword) {
      try {
        await navigator.clipboard.writeText(this.generatedPassword);
        alert(this.translateService.instant('CREATE_USER.PASSWORD_COPIED'));
      } catch (err) {
        console.error('Failed to copy password:', err);
      }
    }
  }

  closeModal() {
    this.close.emit();
  }
}
