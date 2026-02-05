import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxMaskDirective } from 'ngx-mask';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { CreateUserDto, RoleOption, CreateUserResponseDto } from '../../models/user';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgxMaskDirective],
  templateUrl: './create-user.html',
  styleUrl: './create-user.css',
})
export class CreateUser implements OnInit {
  userForm: FormGroup;
  availableRoles: RoleOption[] = [];
  canadianProvinces: { key: string; label: string }[] = [];
  isLoading = false;
  generatedPassword: string | null = null;
  showPasswordModal = false;
  selectedRole: string = ''; // Changed from array to single string

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private translateService: TranslateService,
    private router: Router
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
    // Clear the array and add the single selected role
    this.rolesFormArray.clear();
    this.rolesFormArray.push(this.fb.control(roleKey));
  }

  isRoleSelected(roleKey: string): boolean {
    return this.selectedRole === roleKey;
  }

  // Simplified error checking
  getError(field: string): string | null {
    const control = this.userForm.get(field);
    if (!control?.touched || !control?.errors) return null;

    if (control.hasError('required')) return this.translateService.instant('COMMON.REQUIRED_FIELD');
    if (control.hasError('email')) return this.translateService.instant('COMMON.INVALID_EMAIL');
    if (control.hasError('pattern')) {
      if (field === 'postalCode') {
        return this.translateService.instant('PROFILE.INVALID_POSTAL_CODE');
      }
      return this.translateService.instant('COMMON.INVALID_FORMAT');
    }
    if (control.hasError('minlength')) {
      if (field === 'phoneNumber') {
        return this.translateService.instant('COMMON.INVALID_PHONE');
      }
      if (field === 'postalCode') {
        return this.translateService.instant('PROFILE.INVALID_POSTAL_CODE');
      }
      const min = control.getError('minlength').requiredLength;
      return this.translateService.instant('COMMON.MIN_LENGTH', { min });
    }
    if (control.hasError('maxlength')) {
      const max = control.getError('maxlength').requiredLength;
      return this.translateService.instant('COMMON.MAX_LENGTH', { max });
    }

    return null;
  }

  async createUser() {
    // Mark all as touched to show errors
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid || !this.selectedRole) {
      return;
    }

    this.isLoading = true;

    try {
      // Remove spaces from postal code before sending
      const postalCodeWithoutSpaces = this.userForm.value.postalCode.replace(/\s/g, '');

      const userData: CreateUserDto = {
        firstName: this.userForm.value.firstName,
        lastName: this.userForm.value.lastName,
        email: this.userForm.value.email,
        phoneNumber: this.userForm.value.phoneNumber,
        streetNumber: this.userForm.value.streetNumber,
        streetName: this.userForm.value.streetName,
        city: this.userForm.value.city,
        province: this.userForm.value.province, // Already the translated label from dropdown
        postalCode: postalCodeWithoutSpaces, // 6 characters only
        roles: [this.selectedRole] // Send as array with single role
      };

      const response: CreateUserResponseDto = await this.adminService.createUser(userData);
      
      this.generatedPassword = response.generatedPassword;
      this.showPasswordModal = true;
      
      // Reset form
      this.userForm.reset();
      this.rolesFormArray.clear();
      this.selectedRole = '';

    } catch (error: any) {
      console.error('Error creating user:', error);
    } finally {
      this.isLoading = false;
    }
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.generatedPassword = null;
    this.router.navigate(['/manage-users']);
  }

  cancel() {
    this.router.navigate(['/manage-users']);
  }

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
}
