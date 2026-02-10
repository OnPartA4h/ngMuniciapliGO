import { Component, OnInit, Output, EventEmitter } from '@angular/core';

import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GeneralService } from '../../../services/general-service';
import { LanguageService } from '../../../services/language-service';
import { CreateUserDto, RoleOption } from '../../../models/user';
import { UserFormComponent } from '../user-form/user-form';

@Component({
  selector: 'app-create-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UserFormComponent],
  templateUrl: './create-user-form.html',
  styleUrl: './create-user-form.css',
})
export class CreateUserFormComponent implements OnInit {
  @Output() formSubmit = new EventEmitter<CreateUserDto>();
  @Output() cancel = new EventEmitter<void>();

  userForm: FormGroup;
  availableRoles: RoleOption[] = [];
  canadianProvinces: { key: string; label: string }[] = [];
  isLoading = false;
  selectedRole = '';

  constructor(
    private fb: FormBuilder,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private translateService: TranslateService,
  ) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10)]],
      streetNumber: ['', [Validators.required, Validators.maxLength(20)]],
      streetName: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      province: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/)]],
      roles: this.fb.array([], Validators.required)
    });
  }

  async ngOnInit() {
    await this.loadRoles();
    await this.loadProvinces();
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.availableRoles = await this.generalService.getRoles(lang);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async loadProvinces() {
    this.canadianProvinces = [
      { key: 'QC', label: this.translateService.instant('PROVINCES.QC') },
      { key: 'ON', label: this.translateService.instant('PROVINCES.ON') },
      { key: 'BC', label: this.translateService.instant('PROVINCES.BC') },
      { key: 'AB', label: this.translateService.instant('PROVINCES.AB') },
      { key: 'MB', label: this.translateService.instant('PROVINCES.MB') },
      { key: 'SK', label: this.translateService.instant('PROVINCES.SK') },
      { key: 'NS', label: this.translateService.instant('PROVINCES.NS') },
      { key: 'NB', label: this.translateService.instant('PROVINCES.NB') },
      { key: 'NL', label: this.translateService.instant('PROVINCES.NL') },
      { key: 'PE', label: this.translateService.instant('PROVINCES.PE') },
      { key: 'NT', label: this.translateService.instant('PROVINCES.NT') },
      { key: 'YT', label: this.translateService.instant('PROVINCES.YT') },
      { key: 'NU', label: this.translateService.instant('PROVINCES.NU') }
    ];
  }

  get rolesFormArray(): FormArray {
    return this.userForm.get('roles') as FormArray;
  }

  selectRole(roleKey: string) {
    this.selectedRole = roleKey;
    this.rolesFormArray.clear();
    this.rolesFormArray.push(this.fb.control(roleKey));
  }

  isRoleSelected(roleKey: string): boolean {
    return this.selectedRole === roleKey;
  }

  /** Set loading state from parent (during API call) */
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  /** Reset form after successful creation */
  resetForm() {
    this.userForm.reset();
    this.rolesFormArray.clear();
    this.selectedRole = '';
  }

  submitForm() {
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid || !this.selectedRole) {
      return;
    }

    const postalCodeWithoutSpaces = this.userForm.value.postalCode.replace(/\s/g, '');

    const userData: CreateUserDto = {
      firstName: this.userForm.value.firstName,
      lastName: this.userForm.value.lastName,
      email: this.userForm.value.email,
      phoneNumber: this.userForm.value.phoneNumber,
      streetNumber: this.userForm.value.streetNumber,
      streetName: this.userForm.value.streetName,
      city: this.userForm.value.city,
      province: this.userForm.value.province,
      postalCode: postalCodeWithoutSpaces,
      roles: [this.selectedRole]
    };

    this.formSubmit.emit(userData);
  }

  onCancel() {
    this.cancel.emit();
  }
}
