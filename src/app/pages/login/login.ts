import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { ForceResetPasswordModal } from '../../components/modals/force-reset-password-modal/force-reset-password-modal';
import { ForgotPasswordModal } from '../../components/modals/forgot-password-modal/forgot-password-modal';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, TranslateModule, ForceResetPasswordModal, ForgotPasswordModal],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);
  router = inject(Router);
  
  formGroup: FormGroup;
  showResetPasswordModal = false;
  showForgotPasswordModal = false;
  currentPassword = '';
  isLoading = false;

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

  async login() {
    if (!this.formGroup.valid) return
    
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
      if (error.status >= 500 || error.status == 0){
        this.errorMessage = "Server ERROR GRRRR"
      } else if (error.status < 500){
        this.errorMessage = "Invalid Credentials"
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
    if (!this.roles.includes("Admin") && !this.roles.includes("ColBlanc")) {
        console.log("NOT ADMIN OR COL BLANC!!!!");
        this.errorMessage = "NOT ADMIN OR COL BLANC!!!!"
        return;
      }
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

