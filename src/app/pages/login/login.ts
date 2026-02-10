import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ForceResetPasswordModal } from '../../components/modals/force-reset-password-modal/force-reset-password-modal';
import { ForgotPasswordModal } from '../../components/modals/forgot-password-modal/forgot-password-modal';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, CommonModule, TranslateModule, ForceResetPasswordModal, ForgotPasswordModal],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  
  formGroup: FormGroup;
  showResetPasswordModal = false;
  showForgotPasswordModal = false;
  currentPassword = '';
  isLoading = false;

  constructor(public authService: AuthService, private formBuilder: FormBuilder, public router: Router) {
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

      let token = this.authService.token()
      let roles = this.authService.roles()

      // Check if user needs to reset password
      const loginResponse = this.authService.getLoginResponse();
      if (loginResponse && loginResponse.user.mustResetPassword) {
        // Store the current password for the reset modal
        this.currentPassword = password;
        this.showResetPasswordModal = true;
        this.isLoading = false;
        return;
      }

      if (roles.includes('Admin') && token){
        this.router.navigate(['/manage-users'])
        return
      }

      if (roles.includes('ColBlanc') && token){
        this.router.navigate(['/manage-reports'])
        return
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onPasswordReset() {
    // After password reset, redirect based on roles
    this.showResetPasswordModal = false;
    let roles = this.authService.roles()
    let token = this.authService.token()

    if (roles.includes('Admin') && token){
      this.router.navigate(['/manage-users'])
      return
    }

    if (roles.includes('ColBlanc') && token){
      this.router.navigate(['/manage-reports'])
      return
    }
  }

  onResetError(error: string | undefined) {
    // Handle error if needed
    console.error('Password reset error:', error);
  }

  openForgotPasswordModal() {
    this.showForgotPasswordModal = true;
  }

  closeForgotPasswordModal() {
    this.showForgotPasswordModal = false;
  }
}

