import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChangePasswordDto } from '../../../models/user';

@Component({
  selector: 'app-profile-password-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './profile-password-form.html',
})
export class ProfilePasswordFormComponent {
  @Input() isSaving = false;
  @Input() successMessage: string | null = null;
  @Input() errorMessage: string | null = null;

  @Output() formSubmit = new EventEmitter<ChangePasswordDto>();

  passwordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private translateService: TranslateService,
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  /** Reset form after successful password change */
  resetForm() {
    this.passwordForm.reset();
  }

  get passwordsMismatch(): boolean {
    const newPw = this.passwordForm.get('newPassword');
    const confirmPw = this.passwordForm.get('confirmPassword');
    return !!(
      confirmPw?.touched &&
      newPw?.touched &&
      newPw?.value &&
      confirmPw?.value &&
      newPw.value !== confirmPw.value
    );
  }

  submitForm() {
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid) {
      return;
    }

    const newPassword = this.passwordForm.value.newPassword;
    const confirmPassword = this.passwordForm.value.confirmPassword;

    if (newPassword !== confirmPassword) {
      // Mismatch is shown via template, but also prevent emission
      return;
    }

    const dto: ChangePasswordDto = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: newPassword
    };

    this.formSubmit.emit(dto);
  }
}
