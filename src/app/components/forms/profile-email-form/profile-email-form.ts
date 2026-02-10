import { Component, OnChanges, SimpleChanges, inject, input, output } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-email-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './profile-email-form.html',
})
export class ProfileEmailFormComponent implements OnChanges {
  private fb = inject(FormBuilder);

  readonly currentEmail = input<string | null>(null);
  readonly isSaving = input(false);
  readonly successMessage = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);

  readonly formSubmit = output<{
    newEmail: string;
}>();

  emailForm: FormGroup;

  constructor() {
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    const currentEmail = this.currentEmail();
    if (changes['currentEmail'] && currentEmail) {
      this.emailForm.patchValue({ newEmail: currentEmail });
    }
  }

  /** Reset the form (called by parent after successful submission) */
  resetForm() {
    this.emailForm.reset();
  }

  submitForm() {
    this.emailForm.markAllAsTouched();

    if (this.emailForm.invalid) {
      return;
    }

    this.formSubmit.emit({ newEmail: this.emailForm.value.newEmail });
  }
}
