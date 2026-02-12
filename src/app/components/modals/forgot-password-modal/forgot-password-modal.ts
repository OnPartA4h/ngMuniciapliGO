import { Component, Input, inject, output } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './forgot-password-modal.html',
  styleUrl: './forgot-password-modal.css',
})
export class ForgotPasswordModal {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly close = output<void>();

  forgotPasswordForm: FormGroup;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async submitForgotPassword() {
    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const email = this.forgotPasswordForm.get('email')?.value;
      await this.authService.forgotPassword(email);

      this.successMessage = 'LOGIN.FORGOT_PASSWORD_SUCCESS';
      this.forgotPasswordForm.reset();

      // Close modal after 3 seconds
      setTimeout(() => {
        this.closeModal();
      }, 3000);
    } catch (error: any) {
      console.error('Error sending forgot password request:', error);
      this.errorMessage = error?.error?.message || 'LOGIN.FORGOT_PASSWORD_ERROR';
    } finally {
      this.isLoading = false;
    }
  }

  closeModal() {
    this.forgotPasswordForm.reset();
    this.errorMessage = null;
    this.successMessage = null;
    this.close.emit(undefined);
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
