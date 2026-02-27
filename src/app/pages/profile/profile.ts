import { Component, OnInit, inject, viewChild, signal } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { RoleOption, UpdateUserDto, ChangePasswordDto, User } from '../../models/user';
import { ImageCropperModal } from '../../components/modals/image-cropper-modal/image-cropper-modal';
import { ChangeEmailModal } from '../../components/modals/change-email-modal/change-email-modal';
import { UserService } from '../../services/user-service';
import { LoadingSpinnerComponent, PageHeaderComponent, ToastService } from '../../components/ui';
import { ProfileInfoFormComponent } from '../../components/forms/profile-info-form/profile-info-form';
import { ProfileEmailFormComponent } from '../../components/forms/profile-email-form/profile-email-form';
import { ProfilePasswordFormComponent } from '../../components/forms/profile-password-form/profile-password-form';
import { NotificationService } from '../../services/notification.service';
import { Problem } from '../../models/problem';
import { Pagination } from '../../models/pagination';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { ConfirmModalComponent } from '../../components/modals/confirm-modal/confirm-modal';

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
    ProfilePasswordFormComponent,
    RouterLink,
    DaysAgoPipe,
    ConfirmModalComponent,
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
  private route = inject(ActivatedRoute)
  private notifService = inject(NotificationService);
  private toastService = inject(ToastService);
  generalServicePublic = inject(GeneralService);

  showDeletePhotoConfirm = signal(false);

  readonly emailFormComponent = viewChild.required(ProfileEmailFormComponent);
  readonly passwordFormComponent = viewChild.required(ProfilePasswordFormComponent);

  profile = signal<User | null>(null);
  roles = signal<RoleOption[]>([]);
  userId = signal<string | null>(null)
  
  isLoading = signal(true);
  isSavingInfo = signal(false);
  isSavingPassword = signal(false);
  isSavingEmail = signal(false);
  
  infoSuccessMessage = signal<string | null>(null);
  infoErrorMessage = signal<string | null>(null);
  passwordSuccessMessage = signal<string | null>(null);
  passwordErrorMessage = signal<string | null>(null);
  emailSuccessMessage = signal<string | null>(null);
  emailErrorMessage = signal<string | null>(null);
  
  profileImageUrl = signal<string | null>(null);
  
  // Image cropper properties
  showImageCropper = signal(false);
  imageChangedEvent = signal<Event | null>(null);
  isUploadingImage = signal(false);
  
  // Email verification modal
  showEmailVerificationModal = signal(false);
  pendingEmail = signal<string | null>(null);

  // Subscribed tasks
  subscribedProblems = signal<Problem[]>([]);
  subscribedPagination = signal<Pagination | null>(null);
  isLoadingSubscribed = signal(false);

  async ngOnInit() {
    try {
      await this.loadRoles();
      await this.loadProfile();
      await this.loadSubscribedProblems();
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProfile() {
    try {
      let profileData: any
      let userId = this.route.snapshot.paramMap.get('id')
      if (userId){
        this.userId.set(userId)
        profileData = await this.userService.getPublicProfile(userId)
      } else {
        profileData = await this.userService.getProfile();
      }
      
      this.profile.set(profileData);
      
      if (profileData?.profilePictureUrl) {
        this.profileImageUrl.set(profileData.profilePictureUrl);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      this.infoErrorMessage.set(this.translateService.instant('PROFILE.ERROR_LOADING'));
    }
  }

  async sendResetPasswordEmail() {
    try {
      await this.authService.forgotPassword(this.profile()!.email);
      this.toastService.success(this.translateService.instant('PROFILE.RESET_EMAIL_SENT'));
    } catch (error) {
      console.error('Error sending reset password email:', error);
      this.toastService.error(this.translateService.instant('PROFILE.RESET_EMAIL_ERROR'));
    }
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      const rolesData = await this.generalService.getRoles(lang);
      this.roles.set(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async loadSubscribedProblems(page: number = 1) {
    this.isLoadingSubscribed.set(true);
    try {
      const res = await this.notifService.getSubscribedProblems({ page });
      this.subscribedProblems.set(res.items);
      this.subscribedPagination.set(res.pagination);
    } catch (error) {
      console.error('Error loading subscribed problems:', error);
      this.subscribedProblems.set([]);
    } finally {
      this.isLoadingSubscribed.set(false);
    }
  }

  async onSubscribedPageChange(page: number) {
    await this.loadSubscribedProblems(page);
  }

  getRoleLabel(roleKey: string): string {
    const role = this.roles().find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  // --- Personal Info API call ---
  async onSavePersonalInfo(dto: UpdateUserDto) {
    if (this.userId()){
      dto.userId = this.userId()
    }
    this.isSavingInfo.set(true);
    this.infoSuccessMessage.set(null);
    this.infoErrorMessage.set(null);

    try {
      const response = await this.userService.updateUser(dto);
      this.infoSuccessMessage.set(this.translateService.instant('PROFILE.SUCCESS_UPDATE'));
      this.profile.set(response.user);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      this.infoErrorMessage.set(this.translateService.instant('PROFILE.ERROR_UPDATE'));
    } finally {
      this.isSavingInfo.set(false);
    }
  }

  // --- Password API call ---
  async onSavePassword(dto: ChangePasswordDto) {
    this.passwordSuccessMessage.set(null);
    this.passwordErrorMessage.set(null);
    this.isSavingPassword.set(true);

    try {
      const response = await this.userService.changePassword(dto);
      this.passwordSuccessMessage.set(this.translateService.instant('PROFILE.PASSWORD_SUCCESS'));
      this.passwordFormComponent().resetForm();
    } catch (error: any) {
      console.error('Error changing password:', error);
      this.passwordErrorMessage.set(this.translateService.instant('PROFILE.PASSWORD_ERROR'));
    } finally {
      this.isSavingPassword.set(false);
    }
  }

  // --- Email change API call ---
  async onRequestEmailChange(data: { newEmail: string }) {
    this.emailSuccessMessage.set(null);
    this.emailErrorMessage.set(null);
    this.isSavingEmail.set(true);

    try {
      await this.userService.requestEmailChange({ newEmail: data.newEmail });
      this.pendingEmail.set(data.newEmail);
      this.showEmailVerificationModal.set(true);
      this.emailFormComponent().resetForm();
    } catch (error: any) {
      console.error('Error requesting email change:', error);
      this.emailErrorMessage.set(this.translateService.instant('PROFILE.EMAIL_REQUEST_ERROR'));
    } finally {
      this.isSavingEmail.set(false);
    }
  }

  closeEmailVerificationModal() {
    this.showEmailVerificationModal.set(false);
    this.pendingEmail.set(null);
  }

  async onEmailVerified(newEmail: string) {
    const profileData = await this.userService.getProfile();
    this.profile.set(profileData);
    this.closeEmailVerificationModal();
    this.emailSuccessMessage.set(this.translateService.instant('PROFILE.EMAIL_CHANGED_SUCCESS'));
  }

  // --- Image handling (stays in page as it involves DOM + multiple API calls) ---
  onFileSelected(event: Event) {
    this.imageChangedEvent.set(event);
    this.showImageCropper.set(true);
  }

  onCropCancelled() {
    this.showImageCropper.set(false);
    this.imageChangedEvent.set(null);
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onCropperError(errorKey: string) {
    this.infoErrorMessage.set(this.translateService.instant(errorKey));
    this.showImageCropper.set(false);
    this.imageChangedEvent.set(null);
  }

  async onImageUploaded(croppedBlob: Blob) {
    this.isUploadingImage.set(true);
    this.infoSuccessMessage.set(null);
    this.infoErrorMessage.set(null);

    try {
      const file = new File([croppedBlob], 'profile-picture.jpg', { type: 'image/jpeg' });
      const response = await this.userService.uploadProfilePicture(file);
      this.profileImageUrl.set(response.profilePictureUrl);
      this.authService.setProfilePictureUrl(response.profilePictureUrl);
      const profileData = await this.userService.getProfile();
      this.profile.set(profileData);
      this.infoSuccessMessage.set(this.translateService.instant('PROFILE.PHOTO_UPLOADED'));
      this.showImageCropper.set(false);
      this.imageChangedEvent.set(null);
      const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      if (error?.error?.message) {
        this.infoErrorMessage.set(error.error.message);
      } else {
        this.infoErrorMessage.set(this.translateService.instant('PROFILE.PHOTO_ERROR'));
      }
    } finally {
      this.isUploadingImage.set(false);
    }
  }

  triggerFileInput() {
    document.getElementById('profileImageInput')?.click();
  }

  async removeProfileImage() {
    this.showDeletePhotoConfirm.set(true);
  }

  async confirmRemoveProfileImage() {
    this.showDeletePhotoConfirm.set(false);
    this.isUploadingImage.set(true);
    this.infoSuccessMessage.set(null);
    this.infoErrorMessage.set(null);

    try {
      await this.userService.deleteProfilePicture();
      this.profileImageUrl.set(null);
      this.authService.setProfilePictureUrl(null);
      const profileData = await this.userService.getProfile();
      this.profile.set(profileData);
      this.toastService.success(this.translateService.instant('PROFILE.PHOTO_DELETED'));
    } catch (error: any) {
      console.error('Error deleting profile picture:', error);
      this.toastService.error(this.translateService.instant('PROFILE.PHOTO_DELETE_ERROR'));
    } finally {
      this.isUploadingImage.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
