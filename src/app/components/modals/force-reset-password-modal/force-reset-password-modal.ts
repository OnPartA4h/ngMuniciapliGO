import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../services/user-service';
import { ChangePasswordDto } from '../../../models/user';

@Component({
  selector: 'app-force-reset-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './force-reset-password-modal.html',
  styleUrl: './force-reset-password-modal.css',
})
export class ForceResetPasswordModal {
  @Input() currentPassword: string = '';
  
  @Output() passwordReset = new EventEmitter<void>();
  @Output() resetError = new EventEmitter<string | undefined>();

  resetPasswordForm: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private translateService: TranslateService
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  async submitResetPassword() {
    this.resetPasswordForm.markAllAsTouched();
    
    if (this.resetPasswordForm.invalid) {
      return;
    }

    const newPassword = this.resetPasswordForm.value.newPassword;
    const confirmPassword = this.resetPasswordForm.value.confirmPassword;

    this.errorMessage = null;

    if (newPassword !== confirmPassword) {
      this.errorMessage = this.translateService.instant('PROFILE.PASSWORD_MISMATCH');
      return;
    }

    this.isSubmitting = true;
    // Disable form inputs during submission
    this.resetPasswordForm.disable();

    try {
      const dto: ChangePasswordDto = {
        currentPassword: this.currentPassword,
        newPassword: newPassword
      };

      const response = await this.userService.changePassword(dto);
      this.passwordReset.emit();
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      this.errorMessage = error?.error?.message || this.translateService.instant('PROFILE.PASSWORD_ERROR');
      this.resetError.emit(this.errorMessage || undefined);
    } finally {
      this.isSubmitting = false;
      // Re-enable form inputs after submission
      this.resetPasswordForm.enable();
    }
  }
}
