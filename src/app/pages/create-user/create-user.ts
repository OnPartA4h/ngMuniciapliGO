import { Component, inject, viewChild } from '@angular/core';

import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../services/admin-service';
import { CreateUserDto, CreateUserResponseDto } from '../../models/user';
import { PageHeaderComponent } from '../../components/ui';
import { CreateUserFormComponent } from '../../components/forms/create-user-form/create-user-form';
import { PasswordSuccessModalComponent } from '../../components/modals/password-success-modal/password-success-modal';

@Component({
  selector: 'app-create-user',
  imports: [TranslateModule, PageHeaderComponent, CreateUserFormComponent, PasswordSuccessModalComponent],
  templateUrl: './create-user.html',
  styleUrl: './create-user.css',
})
export class CreateUser {
  private adminService = inject(AdminService);
  private router = inject(Router);

  readonly createUserForm = viewChild.required(CreateUserFormComponent);

  generatedPassword: string | null = null;
  showPasswordModal = false;

  async onFormSubmit(userData: CreateUserDto) {
    this.createUserForm().setLoading(true);

    try {
      const response: CreateUserResponseDto = await this.adminService.createUser(userData);

      this.generatedPassword = response.generatedPassword;
      this.showPasswordModal = true;

      // Reset the form after success
      this.createUserForm().resetForm();
    } catch (error: any) {
      console.error('Error creating user:', error);
    } finally {
      this.createUserForm().setLoading(false);
    }
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.generatedPassword = null;
    this.router.navigate(['/manage-users']);
  }

  cancel() {
    this.router.navigate(['/manage-users']);
  }
}
