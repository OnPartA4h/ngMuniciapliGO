import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ForceResetPasswordModal } from '../../components/modals/force-reset-password-modal/force-reset-password-modal';
import { ForgotPasswordModal } from '../../components/modals/forgot-password-modal/forgot-password-modal';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, TranslateModule, ForceResetPasswordModal, ForgotPasswordModal],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private translateService = inject(TranslateService);
  
  formGroup: FormGroup;
  showResetPasswordModal = false;
  showForgotPasswordModal = false;
  currentPassword = '';
  isLoading = false;
  sessionExpired = false;

  roles: string[] = []
  token: string | null = null
  errorMessage: string = ""

  constructor() {
    this.formGroup = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
      }
    )
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        this.sessionExpired = true;
      }
    });
  }

  async login() {
    if (!this.formGroup.valid) return
    
    this.sessionExpired = false;
    this.isLoading = true;
    
    let email = this.formGroup.get('email')?.value
    let password = this.formGroup.get('password')?.value

    try {
      await this.authService.login(email, password)

      this.token = this.authService.token()
      this.roles = this.authService.roles()

      this.verifyPermissions()

      const loginResponse = this.authService.getLoginResponse();
      if (loginResponse && loginResponse.user.mustResetPassword) {
        this.currentPassword = password;
        this.showResetPasswordModal = true;
        this.isLoading = false;
        return;
      }

      await this.handleRedirection()

    } catch (error: any) {
      switch (error.status) {
        case 401:
          this.errorMessage = this.translateService.instant('LOGIN.INVALID_CREDENTIALS');
          break;
        case 500:
          this.errorMessage = this.translateService.instant('LOGIN.SERVER_ERROR');
          break;
        default:
          this.errorMessage = this.translateService.instant('LOGIN.SOMETHING_WENT_WRONG');
          break
      }
    } finally {
      this.isLoading = false;
    }
  }

  async onPasswordReset() {
    this.showResetPasswordModal = false;
    await this.handleRedirection()
  }

  verifyPermissions(){
    if (this.roles.includes("Admin") || this.roles.includes("ColBlanc") || this.roles.includes("Support")) return
    this.errorMessage = this.translateService.instant('LOGIN.INSUFFICIENT_PERMISSIONS');
    this.authService.logout()
  }

  async handleRedirection() {
    if (this.roles.includes('Admin') && this.token){
        this.router.navigate(['/manage-users'])
        await this.authService.connectToNotificationHub();
        return
      }

    if (this.roles.includes('ColBlanc') && this.token){
      this.router.navigate(['/manage-reports'])
      await this.authService.connectToNotificationHub();
      return
    }

    if (this.roles.includes('Support') && this.token) {
      this.router.navigate(['/help-desk'])
      await this.authService.connectToNotificationHub();
      return
    }
  }

  onResetError(error: string | undefined) {
    console.error('Password reset error:', error);
  }

  openForgotPasswordModal() {
    this.showForgotPasswordModal = true;
  }

  closeForgotPasswordModal() {
    this.showForgotPasswordModal = false;
  }
}

