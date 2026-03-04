import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ForceResetPasswordModal } from '../../components/modals/force-reset-password-modal/force-reset-password-modal';
import { ForgotPasswordModal } from '../../components/modals/forgot-password-modal/forgot-password-modal';
import { assetUrl } from '../../app.config';

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

  logoUrl = assetUrl('assets/images/Logo.png');
  logoTextUrl = assetUrl('assets/images/LogoText.png');
  
  formGroup: FormGroup;
  showResetPasswordModal = signal<boolean>(false);
  showForgotPasswordModal = signal<boolean>(false);
  currentPassword = signal<string>("");
  isLoading = signal<boolean>(false);
  sessionExpired = signal<boolean>(false);

  roles = signal<string[]>([])
  token = signal<string | null>(null)
  errorMessage = signal<string>("")

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
        this.sessionExpired.set(true);
      }
    });
  }

  async login() {
    if (!this.formGroup.valid) return
    
    this.sessionExpired.set(false);
    this.isLoading.set(true)
    
    let email = this.formGroup.get('email')?.value
    let password = this.formGroup.get('password')?.value

    try {
      await this.authService.login(email, password)

      this.token.set(this.authService.token()) 
      this.roles.set(this.authService.roles())

      this.verifyPermissions()

      const loginResponse = this.authService.getLoginResponse();
      if (loginResponse && loginResponse.user.mustResetPassword) {
        this.currentPassword.set(password);
        this.showResetPasswordModal.set(true);
        this.isLoading.set(false)
        return;
      }

      await this.handleRedirection()

    } catch (error: any) {
      this.errorHandling(error)

    } finally {
      this.isLoading.set(false);
    }
  }

  async onPasswordReset() {
    this.showResetPasswordModal.set(false)
    await this.handleRedirection()
  }

  verifyPermissions(){
    if (this.roles().includes("Admin") || this.roles().includes("ColBlanc") || this.roles().includes("Support")) return
    this.errorMessage.set(this.translateService.instant('LOGIN.INSUFFICIENT_PERMISSIONS'));
    this.authService.logout()
  }

  async handleRedirection() {
    if (this.roles().includes('Admin') && this.token()){
        this.router.navigate(['/manage-users'])
        await this.authService.connectToNotificationHub();
        return
      }

    if (this.roles().includes('ColBlanc') && this.token()){
      this.router.navigate(['/manage-reports'])
      await this.authService.connectToNotificationHub();
      return
    }

    if (this.roles().includes('Support') && this.token()) {
      this.router.navigate(['/help-desk'])
      await this.authService.connectToNotificationHub();
      return
    }
  }

  errorHandling(error: any) {
    if (error.status === 0) {
        if (!navigator.onLine){
          this.errorMessage.set(this.translateService.instant('LOGIN.NO_INTERNET'));
        } else {
          this.errorMessage.set(this.translateService.instant('LOGIN.SERVER_DOWN'))
        }
      } else {
        switch (error.status) {
          case 401:
            this.errorMessage.set(this.translateService.instant('LOGIN.INVALID_CREDENTIALS'));
            break;
          case 403:
            this.errorMessage.set(this.translateService.instant('LOGIN.FORBIDDEN'));
            break;
          case 404:
            this.errorMessage.set(this.translateService.instant('LOGIN.NOT_FOUND'));
            break;
          case 429:
            this.errorMessage.set(this.translateService.instant('LOGIN.TOO_MANY_ATTEMPTS'));
            break;
          case 500:
            this.errorMessage.set(this.translateService.instant('LOGIN.SERVER_ERROR'));
            break;
          default:
            if (error.error && error.error.message) {
              this.errorMessage.set(error.error.message);
            } else {
              this.errorMessage.set(this.translateService.instant('LOGIN.SOMETHING_WENT_WRONG'));
            }
            break;
        }
      }
  }

  onResetError(error: string | undefined) {
    console.error('Password reset error:', error);
  }

  openForgotPasswordModal() {
    this.showForgotPasswordModal.set(true);
  }

  closeForgotPasswordModal() {
    this.showForgotPasswordModal.set(false);
  }
}

