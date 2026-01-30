import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { CreateUserDto, RoleOption, CreateUserResponseDto } from '../../models/user';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './create-user.html',
  styleUrl: './create-user.css',
})
export class CreateUser implements OnInit {
  userForm: FormGroup;
  availableRoles: RoleOption[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  generatedPassword: string | null = null;
  showPasswordModal = false;

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
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[\d\s\-\(\)]+$/)]],
      roles: this.fb.array([], Validators.required)
    });
  }

  async ngOnInit() {
    await this.loadRoles();
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.availableRoles = await this.generalService.getRoles(lang);
    } catch (error) {
      console.error('Error loading roles:', error);
      this.errorMessage = this.translateService.instant('CREATE_USER.ERROR_OCCURRED');
    }
  }

  get rolesFormArray(): FormArray {
    return this.userForm.get('roles') as FormArray;
  }

  toggleRole(roleKey: string) {
    const index = this.rolesFormArray.value.indexOf(roleKey);
    if (index > -1) {
      this.rolesFormArray.removeAt(index);
    } else {
      this.rolesFormArray.push(this.fb.control(roleKey));
    }
  }

  hasRole(roleKey: string): boolean {
    return this.rolesFormArray.value.includes(roleKey);
  }

  // Simplified error checking
  getError(field: string): string | null {
    const control = this.userForm.get(field);
    if (!control?.touched || !control?.errors) return null;

    if (control.hasError('required')) return this.translateService.instant('COMMON.REQUIRED_FIELD');
    if (control.hasError('email')) return this.translateService.instant('COMMON.INVALID_EMAIL');
    if (control.hasError('minlength')) {
      const min = control.getError('minlength').requiredLength;
      return this.translateService.instant('COMMON.MIN_LENGTH', { min });
    }
    if (control.hasError('maxlength')) {
      const max = control.getError('maxlength').requiredLength;
      return this.translateService.instant('COMMON.MAX_LENGTH', { max });
    }
    if (control.hasError('pattern')) {
      return this.translateService.instant('COMMON.INVALID_FORMAT');
    }

    return null;
  }

  async createUser() {
    // Mark all as touched to show errors
    this.userForm.markAllAsTouched();

    if (this.userForm.invalid) {
      if (this.rolesFormArray.length === 0) {
        this.errorMessage = this.translateService.instant('CREATE_USER.SELECT_AT_LEAST_ONE_ROLE');
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const userData: CreateUserDto = {
        firstName: this.userForm.value.firstName,
        lastName: this.userForm.value.lastName,
        email: this.userForm.value.email,
        phoneNumber: this.userForm.value.phoneNumber,
        roles: this.userForm.value.roles
      };

      const response: CreateUserResponseDto = await this.adminService.createUser(userData);
      
      this.generatedPassword = response.generatedPassword;
      this.showPasswordModal = true;
      
      // Reset form
      this.userForm.reset();
      this.rolesFormArray.clear();

    } catch (error: any) {
      console.error('Error creating user:', error);
      this.errorMessage = error?.error?.message || this.translateService.instant('CREATE_USER.ERROR_OCCURRED');
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
