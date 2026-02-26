import { Component, inject, input, output } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChangePasswordDto } from '../../../models/user';
import { ActivatedRoute } from '@angular/router';
import { SupportService } from '../../../services/support-service';

@Component({
  selector: 'app-profile-password-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './profile-password-form.html',
  styleUrls: ['./profile-password-form.css'],
})
export class ProfilePasswordFormComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute)
  private translateService = inject(TranslateService);
  private supportService = inject(SupportService)

  readonly isSaving = input(false);
  readonly successMessage = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);

  readonly formSubmit = output<ChangePasswordDto>();
  readonly forgotPassword = output<void>()


  passwordForm: FormGroup;

  constructor() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  isUserId(): boolean {
    return !!this.route.snapshot.paramMap.get('id');
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
