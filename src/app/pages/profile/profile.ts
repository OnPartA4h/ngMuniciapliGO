import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { RoleOption, UpdateUserDto, ChangePasswordDto, User } from '../../models/user';
import { ImageCropperModal } from '../../components/image-cropper-modal/image-cropper-modal';
import { ChangeEmailModal } from '../../components/change-email-modal/change-email-modal';
import { UserService } from '../../services/user-service';
import { LoadingSpinnerComponent, PageHeaderComponent } from '../../components/ui';
import { UserFormComponent } from '../../components/user-form/user-form';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, ImageCropperModal, ChangeEmailModal, LoadingSpinnerComponent, PageHeaderComponent, UserFormComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  emailForm: FormGroup;
  
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
      phoneNumber: ['', [Validators.required, Validators.minLength(10)]],
      streetNumber: ['', [Validators.required, Validators.maxLength(20)]],
      streetName: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      province: ['', [Validators.required, Validators.maxLength(100)]],
      postalCode: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', [Validators.required]]
    });

    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]]
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
        phoneNumber: this.profile.phoneNumber,
        streetNumber: this.profile.streetNumber,
        streetName: this.profile.streetName,
        city: this.profile.city,
        province: this.profile.province,
        postalCode: this.profile.postalCode
      });

      // Pre-fill email form with current email
      this.emailForm.patchValue({
        newEmail: this.profile.email
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

      const response = await this.userService.updateUser(dto);
      this.infoSuccessMessage = response.message || this.translateService.instant('PROFILE.SUCCESS_UPDATE');
      
      // Update profile data from response
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
      const dto: ChangePasswordDto = {
        currentPassword: currentPassword,
        newPassword: newPassword
      };

      const response = await this.userService.changePassword(dto);
      this.passwordSuccessMessage = response.message || this.translateService.instant('PROFILE.PASSWORD_SUCCESS');
      
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

  async requestEmailChange() {
    this.emailForm.markAllAsTouched();
    
    if (this.emailForm.invalid) {
      return;
    }

    const newEmail = this.emailForm.value.newEmail;
    this.emailSuccessMessage = null;
    this.emailErrorMessage = null;
    this.isSavingEmail = true;

    try {
      // Send request to change email
      const response = await this.userService.requestEmailChange({ newEmail });
      
      // Store the pending email for the verification modal
      this.pendingEmail = newEmail;
      
      // Show verification modal
      this.showEmailVerificationModal = true;
      
      // Clear the form
      this.emailForm.reset();
      
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
    // Reload profile to get updated email
    this.profile = await this.userService.getProfile();
    this.closeEmailVerificationModal();
    this.emailSuccessMessage = this.translateService.instant('PROFILE.EMAIL_CHANGED_SUCCESS');
    this.cdr.detectChanges();
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
