import { Component, OnInit, ChangeDetectorRef, inject, viewChild } from '@angular/core';

import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { RoleOption, UpdateUserDto, ChangePasswordDto, User } from '../../models/user';
import { ImageCropperModal } from '../../components/modals/image-cropper-modal/image-cropper-modal';
import { ChangeEmailModal } from '../../components/modals/change-email-modal/change-email-modal';
import { UserService } from '../../services/user-service';
import { LoadingSpinnerComponent, PageHeaderComponent } from '../../components/ui';
import { ProfileInfoFormComponent } from '../../components/forms/profile-info-form/profile-info-form';
import { ProfileEmailFormComponent } from '../../components/forms/profile-email-form/profile-email-form';
import { ProfilePasswordFormComponent } from '../../components/forms/profile-password-form/profile-password-form';

@Component({
  selector: 'app-profile',
  imports: [
    TranslateModule,
    ImageCropperModal,
    ChangeEmailModal,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    ProfileInfoFormComponent,
    ProfileEmailFormComponent,
    ProfilePasswordFormComponent
],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly emailFormComponent = viewChild.required(ProfileEmailFormComponent);
  readonly passwordFormComponent = viewChild.required(ProfilePasswordFormComponent);

  profile: User | null = null;
  roles: RoleOption[] = [];
  
  isLoading = true;
  isSavingInfo = false;
  isSavingPassword = false;
  isSavingEmail = false;
  
  infoSuccessMessage: string | null = null;
  infoErrorMessage: string | null = null;
  passwordSuccessMessage: string | null = null;
  passwordErrorMessage: string | null = null;
  emailSuccessMessage: string | null = null;
  emailErrorMessage: string | null = null;
  
  profileImageUrl: string | null = null;
  
  // Image cropper properties
  showImageCropper = false;
  imageChangedEvent: Event | null = null;
  isUploadingImage = false;
  
  // Email verification modal
  showEmailVerificationModal = false;
  pendingEmail: string | null = null;

  async ngOnInit() {
    try {
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
      
      if (this.profile.profilePictureUrl) {
        this.profileImageUrl = this.profile.profilePictureUrl;
      }
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

  // --- Personal Info API call ---
  async onSavePersonalInfo(dto: UpdateUserDto) {
    this.isSavingInfo = true;
    this.infoSuccessMessage = null;
    this.infoErrorMessage = null;

    try {
      const response = await this.userService.updateUser(dto);
      this.infoSuccessMessage = response.message || this.translateService.instant('PROFILE.SUCCESS_UPDATE');
      this.profile = response.user;
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.infoErrorMessage = error?.error?.message || this.translateService.instant('PROFILE.ERROR_UPDATE');
    } finally {
      this.isSavingInfo = false;
      this.cdr.detectChanges();
    }
  }

  // --- Password API call ---
  async onSavePassword(dto: ChangePasswordDto) {
    this.passwordSuccessMessage = null;
    this.passwordErrorMessage = null;
    this.isSavingPassword = true;

    try {
      const response = await this.userService.changePassword(dto);
      this.passwordSuccessMessage = response.message || this.translateService.instant('PROFILE.PASSWORD_SUCCESS');
      this.passwordFormComponent().resetForm();
    } catch (error: any) {
      console.error('Error changing password:', error);
      this.passwordErrorMessage = error?.error?.message || this.translateService.instant('PROFILE.PASSWORD_ERROR');
    } finally {
      this.isSavingPassword = false;
      this.cdr.detectChanges();
    }
  }

  // --- Email change API call ---
  async onRequestEmailChange(data: { newEmail: string }) {
    this.emailSuccessMessage = null;
    this.emailErrorMessage = null;
    this.isSavingEmail = true;

    try {
      await this.userService.requestEmailChange({ newEmail: data.newEmail });
      this.pendingEmail = data.newEmail;
      this.showEmailVerificationModal = true;
      this.emailFormComponent().resetForm();
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error requesting email change:', error);
      this.emailErrorMessage = error?.error?.message || this.translateService.instant('PROFILE.EMAIL_REQUEST_ERROR');
    } finally {
      this.isSavingEmail = false;
      this.cdr.detectChanges();
    }
  }

  closeEmailVerificationModal() {
    this.showEmailVerificationModal = false;
    this.pendingEmail = null;
  }

  async onEmailVerified(newEmail: string) {
    this.profile = await this.userService.getProfile();
    this.closeEmailVerificationModal();
    this.emailSuccessMessage = this.translateService.instant('PROFILE.EMAIL_CHANGED_SUCCESS');
    this.cdr.detectChanges();
  }

  // --- Image handling (stays in page as it involves DOM + multiple API calls) ---
  onFileSelected(event: Event) {
    this.imageChangedEvent = event;
    this.showImageCropper = true;
    this.cdr.detectChanges();
  }

  onCropCancelled() {
    this.showImageCropper = false;
    this.imageChangedEvent = null;
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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
      const file = new File([croppedBlob], 'profile-picture.jpg', { type: 'image/jpeg' });
      const response = await this.userService.uploadProfilePicture(file);
      this.profileImageUrl = response.profilePictureUrl;
      this.profile = await this.userService.getProfile();
      this.infoSuccessMessage = this.translateService.instant('PROFILE.PHOTO_UPLOADED');
      this.showImageCropper = false;
      this.imageChangedEvent = null;
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
