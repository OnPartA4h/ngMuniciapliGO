import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../services/user-service';

@Component({
  selector: 'app-change-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './change-email-modal.html',
  styleUrl: './change-email-modal.css',
})
export class ChangeEmailModal implements OnInit {
  @Input() newEmail: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() emailVerified = new EventEmitter<string>();

  verificationForm: FormGroup;
  
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private translateService: TranslateService
  ) {
    this.verificationForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });
  }

  ngOnInit() {
    // Form is ready when modal opens
  }

  async submitVerification() {
    if (this.verificationForm.invalid || !this.newEmail) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const code = this.verificationForm.get('code')?.value;
      await this.userService.verifyEmailChange({ newEmail: this.newEmail, code });

      this.successMessage = this.translateService.instant('PROFILE.EMAIL_CHANGED_SUCCESS');
      
      // Emit the new email to parent component
      this.emailVerified.emit(this.newEmail);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        this.closeModal();
      }, 2000);
    } catch (error: any) {
      console.error('Error verifying email change:', error);
      this.errorMessage = error?.error?.message || this.translateService.instant('PROFILE.EMAIL_CHANGE_VERIFICATION_ERROR');
    } finally {
      this.isLoading = false;
    }
  }

  async resendCode() {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      await this.userService.resendEmailChangeCode();
      this.successMessage = this.translateService.instant('PROFILE.EMAIL_CHANGE_CODE_RESENT');
    } catch (error: any) {
      console.error('Error resending code:', error);
      this.errorMessage = error?.error?.message || this.translateService.instant('PROFILE.EMAIL_CHANGE_RESEND_ERROR');
    } finally {
      this.isLoading = false;
    }
  }

  closeModal() {
    this.verificationForm.reset();
    this.errorMessage = null;
    this.successMessage = null;
    this.close.emit();
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
