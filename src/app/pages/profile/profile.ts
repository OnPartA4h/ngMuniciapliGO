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
import { ImageCropperModal } from '../../components/image-cropper-modal/image-cropper-modal';
import { UserService } from '../../services/user-service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgxMaskDirective, ImageCropperModal],
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
  
  // Image cropper properties
  showImageCropper = false;
  imageChangedEvent: Event | null = null;
  isUploadingImage = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
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
      this.profile = await this.userService.getProfile();
      
      // Set profile image if it exists
      if (this.profile.profilePictureUrl) {
        this.profileImageUrl = this.profile.profilePictureUrl;
      }
      
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

      await this.userService.updateProfile(dto);
      this.infoSuccessMessage = this.translateService.instant('PROFILE.SUCCESS_UPDATE');
      
      // Reload profile data without showing loading screen
      this.profile = await this.userService.getProfile();
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

      await this.userService.updateProfile(dto);
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
    this.imageChangedEvent = event;
    this.showImageCropper = true;
    this.cdr.detectChanges();
    console.log('File selected, opening cropper modal');
  }

  onCropCancelled() {
    console.log('Cancel clicked, closing modal');
    this.showImageCropper = false;
    this.imageChangedEvent = null;
    // Reset the file input
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    // Force change detection to ensure modal closes immediately
    this.cdr.detectChanges();
  }

  onCropperError(errorKey: string) {
    this.infoErrorMessage = this.translateService.instant(errorKey);
    this.showImageCropper = false;
    this.imageChangedEvent = null;
  }

  async onImageUploaded(croppedBlob: Blob) {
    this.isUploadingImage = true;
    this.infoSuccessMessage = null;
    this.infoErrorMessage = null;

    try {
      // Create a file from the cropped blob
      const file = new File([croppedBlob], 'profile-picture.jpg', { type: 'image/jpeg' });
      
      // Upload the file
      const response = await this.userService.uploadProfilePicture(file);
      
      // Update the profile image URL from the response
      this.profileImageUrl = response.profilePictureUrl;
      
      // Reload profile to get updated data
      this.profile = await this.userService.getProfile();
      
      this.infoSuccessMessage = this.translateService.instant('PROFILE.PHOTO_UPLOADED');
      this.showImageCropper = false;
      this.imageChangedEvent = null;
      
      // Reset the file input
      const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      if (error?.error?.message) {
        this.infoErrorMessage = error.error.message;
      } else {
        this.infoErrorMessage = this.translateService.instant('PROFILE.PHOTO_ERROR');
      }
    } finally {
      this.isUploadingImage = false;
      this.cdr.detectChanges();
    }
  }

  triggerFileInput() {
    document.getElementById('profileImageInput')?.click();
  }

  async removeProfileImage() {
    if (!confirm(this.translateService.instant('PROFILE.CONFIRM_DELETE_PHOTO'))) {
      return;
    }

    this.isUploadingImage = true;
    this.infoSuccessMessage = null;
    this.infoErrorMessage = null;

    try {
      await this.userService.deleteProfilePicture();
      this.profileImageUrl = null;
      
      // Reload profile to get updated data
      this.profile = await this.userService.getProfile();
      
      this.infoSuccessMessage = this.translateService.instant('PROFILE.PHOTO_DELETED');
    } catch (error: any) {
      console.error('Error deleting profile picture:', error);
      this.infoErrorMessage = this.translateService.instant('PROFILE.PHOTO_DELETE_ERROR');
    } finally {
      this.isUploadingImage = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
