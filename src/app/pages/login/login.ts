import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  
  formGroup: FormGroup;

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
    let email = this.formGroup.get('email')?.value
    let password = this.formGroup.get('password')?.value

    await this.authService.login(email, password)

    let token = this.authService.token()
    let roles = this.authService.roles()

    if (roles.includes('Admin') && token){
      this.router.navigate(['/manage-users'])
      return
    }

    if (roles.includes('ColBlanc') && token){
      this.router.navigate(['/manage-reports'])
      return
    }
  }
}
