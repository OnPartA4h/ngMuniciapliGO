import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { User, RoleOption } from '../../models/user';
import { EditUserModal } from '../../components/edit-user-modal/edit-user-modal';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-manage-users',
  imports: [CommonModule, FormsModule, RouterLink, EditUserModal, TranslateModule],
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css',
})
export class ManageUsers implements OnInit {
  users: User[] = [];
  availableRoles: RoleOption[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalPages: number = 1;
  totalUsers: number = 0;

  // Filters
  searchQuery: string = '';
  selectedRole: string = '';

  // Modal state
  showEditModal: boolean = false;
  selectedUser: User | null = null;

  // Loading state
  isLoading: boolean = false;

  constructor(
    private adminService: AdminService,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private cdr: ChangeDetectorRef,
  ) {}
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadRoles(),
      this.loadUsers()
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.loadRoles();
    });
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.availableRoles = await this.generalService.getRoles(lang);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async loadUsers() {
    try {
      this.isLoading = true;
      const response = await this.adminService.getAllUsers(
        this.currentPage,
        this.selectedRole || undefined,
        this.searchQuery || undefined
      );

      this.users = response.users;
      this.currentPage = response.pagination.currentPage;
      this.pageSize = response.pagination.pageSize;
      this.totalPages = response.pagination.totalPages;
      this.totalUsers = response.pagination.totalUsers;
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.isLoading = false;
      // Force change detection to update UI after async operation
      this.cdr.markForCheck();
    }
  }

  async onSearch() {
    this.currentPage = 1;
    await this.loadUsers();
  }

  async onRoleFilterChange() {
    this.currentPage = 1;
    await this.loadUsers();
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadUsers();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadUsers();
    }
  }

  openEditModal(user: User) {
    this.selectedUser = user;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.selectedUser = null;
    this.showEditModal = false;
    this.cdr.markForCheck();
  }

  async onUserDeleted() {
    this.closeEditModal();
    await this.loadUsers();
  }

  getRoleLabel(roleKey: string): string {
    const role = this.availableRoles.find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }
}


