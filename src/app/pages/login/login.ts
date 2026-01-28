import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  
  formGroup: FormGroup;

  constructor(public authService: AuthService, private formBuilder: FormBuilder) {
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
  }
}
