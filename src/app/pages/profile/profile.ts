import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxMaskDirective } from 'ngx-mask';
import { AuthService } from '../../services/auth-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { RoleOption, UpdateProfileDto, User } from '../../models/user';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgxMaskDirective],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  
  profile: User | null = null;
  roles: RoleOption[] = [];
  
  isLoading = true;
  isSavingInfo = false;
  isSavingPassword = false;
  
  infoSuccessMessage: string | null = null;
  infoErrorMessage: string | null = null;
  passwordSuccessMessage: string | null = null;
  passwordErrorMessage: string | null = null;
  
  profileImageUrl: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private translateService: TranslateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.minLength(10)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  async ngOnInit() {
    try {
      // Load roles first so they are available when profile is displayed
      await this.loadRoles();
      await this.loadProfile();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadProfile() {
    try {
      this.profile = await this.authService.getProfile();
      
      this.profileForm.patchValue({
        firstName: this.profile.firstName,
        lastName: this.profile.lastName,
        email: this.profile.email,
        phoneNumber: this.profile.phoneNumber
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      this.infoErrorMessage = this.translateService.instant('PROFILE.ERROR_LOADING');
    }
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.roles = await this.generalService.getRoles(lang);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  getRoleLabel(roleKey: string): string {
    const role = this.roles.find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  async savePersonalInfo() {
    this.profileForm.markAllAsTouched();
    
    if (this.profileForm.invalid) {
      return;
    }

    this.isSavingInfo = true;
    this.infoSuccessMessage = null;
    this.infoErrorMessage = null;

    try {
      const dto: UpdateProfileDto = {
        firstName: this.profileForm.value.firstName,
        lastName: this.profileForm.value.lastName,
        email: this.profileForm.value.email,
        phoneNumber: this.profileForm.value.phoneNumber
      };

      await this.authService.updateProfile(dto);
      this.infoSuccessMessage = this.translateService.instant('PROFILE.SUCCESS_UPDATE');
      
      // Reload profile data without showing loading screen
      this.profile = await this.authService.getProfile();
      this.cdr.detectChanges();
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.infoErrorMessage = error?.error?.message || this.translateService.instant('PROFILE.ERROR_UPDATE');
    } finally {
      this.isSavingInfo = false;
      this.cdr.detectChanges();
    }
  }

  async savePassword() {
    this.passwordForm.markAllAsTouched();
    
    if (this.passwordForm.invalid) {
      return;
    }

    const newPassword = this.passwordForm.value.newPassword;
    const confirmPassword = this.passwordForm.value.confirmPassword;
    const currentPassword = this.passwordForm.value.currentPassword;

    this.passwordSuccessMessage = null;
    this.passwordErrorMessage = null;

    if (newPassword !== confirmPassword) {
      this.passwordErrorMessage = this.translateService.instant('PROFILE.PASSWORD_MISMATCH');
      return;
    }

    this.isSavingPassword = true;

    try {
      const dto: UpdateProfileDto = {
        firstName: this.profile!.firstName,
        lastName: this.profile!.lastName,
        email: this.profile!.email,
        phoneNumber: this.profile!.phoneNumber,
        currentPassword: currentPassword,
        newPassword: newPassword
      };

      await this.authService.updateProfile(dto);
      this.passwordSuccessMessage = this.translateService.instant('PROFILE.PASSWORD_SUCCESS');
      
      // Clear password fields after successful update
      this.passwordForm.reset();
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      this.passwordErrorMessage = error?.error?.message || this.translateService.instant('PROFILE.PASSWORD_ERROR');
    } finally {
      this.isSavingPassword = false;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  triggerFileInput() {
    document.getElementById('profileImageInput')?.click();
  }

  removeProfileImage() {
    this.profileImageUrl = null;
    this.selectedFile = null;
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
