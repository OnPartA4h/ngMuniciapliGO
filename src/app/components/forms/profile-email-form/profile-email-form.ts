import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-email-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './profile-email-form.html',
})
export class ProfileEmailFormComponent implements OnChanges {
  @Input() currentEmail: string | null = null;
  @Input() isSaving = false;
  @Input() successMessage: string | null = null;
  @Input() errorMessage: string | null = null;

  @Output() formSubmit = new EventEmitter<{ newEmail: string }>();

  emailForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentEmail'] && this.currentEmail) {
      this.emailForm.patchValue({ newEmail: this.currentEmail });
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
