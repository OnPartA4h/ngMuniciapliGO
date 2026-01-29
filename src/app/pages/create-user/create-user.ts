import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { CreateUserDto, RoleOption, CreateUserResponseDto } from '../../models/user';

@Component({
  selector: 'app-create-user',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-user.html',
  styleUrl: './create-user.css',
})
export class CreateUser implements OnInit {
  // Form data
  userData: CreateUserDto = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    roles: []
  };

  // Available roles
  availableRoles: RoleOption[] = [];

  // State management
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  generatedPassword: string | null = null;
  showPasswordModal = false;

  // Validation state
  formTouched = false;

  constructor(
    private adminService: AdminService,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadRoles();
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.availableRoles = await this.generalService.getRoles(lang);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  toggleRole(roleKey: string) {
    const index = this.userData.roles.indexOf(roleKey);
    if (index > -1) {
      this.userData.roles.splice(index, 1);
    } else {
      this.userData.roles.push(roleKey);
    }
  }

  hasRole(roleKey: string): boolean {
    return this.userData.roles.includes(roleKey);
  }

  isFormValid(): boolean {
    return !!(
      this.userData.firstName.trim() &&
      this.userData.lastName.trim() &&
      this.userData.email.trim() &&
      this.userData.phoneNumber.trim() &&
      this.userData.roles.length > 0
    );
  }

  async createUser() {
    this.formTouched = true;

    if (!this.isFormValid()) {
      this.errorMessage = 'Veuillez remplir tous les champs requis.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const response: CreateUserResponseDto = await this.adminService.createUser(this.userData);
      
      this.generatedPassword = response.generatedPassword;
      this.showPasswordModal = true;
      this.successMessage = 'Utilisateur créé avec succès!';
      
      // Reset form
      this.userData = {
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        roles: []
      };
      this.formTouched = false;

    } catch (error: any) {
      console.error('Error creating user:', error);
      this.errorMessage = error?.error?.message || 'Une erreur est survenue lors de la création de l\'utilisateur.';
    } finally {
      this.isLoading = false;
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

  async copyPassword() {
    if (this.generatedPassword) {
      try {
        await navigator.clipboard.writeText(this.generatedPassword);
        alert('Mot de passe copié dans le presse-papier!');
      } catch (err) {
        console.error('Failed to copy password:', err);
      }
    }
  }
}
