import { Component, Output, EventEmitter, OnChanges, SimpleChanges, inject, input } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UpdateUserDto, User } from '../../../models/user';
import { UserFormComponent } from '../user-form/user-form';

@Component({
  selector: 'app-profile-info-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UserFormComponent],
  templateUrl: './profile-info-form.html',
})
export class ProfileInfoFormComponent implements OnChanges {
  private fb = inject(FormBuilder);

  readonly profile = input<User | null>(null);
  readonly isSaving = input(false);
  readonly successMessage = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);

  @Output() formSubmit = new EventEmitter<UpdateUserDto>();

  profileForm: FormGroup;

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10)]],
      streetNumber: ['', [Validators.required, Validators.maxLength(20)]],
      streetName: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      province: ['', [Validators.required, Validators.maxLength(100)]],
      postalCode: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/)]]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    const profile = this.profile();
    if (changes['profile'] && profile) {
      this.profileForm.patchValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        streetNumber: profile.streetNumber,
        streetName: profile.streetName,
        city: profile.city,
        province: profile.province,
        postalCode: profile.postalCode
      });
    }
  }

  submitForm() {
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      return;
    }

    const dto: UpdateUserDto = {
      firstName: this.profileForm.value.firstName,
      lastName: this.profileForm.value.lastName,
      phoneNumber: this.profileForm.value.phoneNumber,
      streetNumber: this.profileForm.value.streetNumber,
      streetName: this.profileForm.value.streetName,
      city: this.profileForm.value.city,
      province: this.profileForm.value.province,
      postalCode: this.profileForm.value.postalCode
    };

    this.formSubmit.emit(dto);
  }
}
