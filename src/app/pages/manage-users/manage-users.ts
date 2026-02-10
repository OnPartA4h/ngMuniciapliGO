import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { User, RoleOption } from '../../models/user';
import { EditUserModal } from '../../components/modals/edit-user-modal/edit-user-modal';
import { PaginationComponent, LoadingSpinnerComponent, PageHeaderComponent } from '../../components/ui';
import { UsersTableComponent } from '../../components/tables/users-table/users-table';

@Component({
  selector: 'app-manage-users',
  imports: [FormsModule, RouterLink, EditUserModal, TranslateModule, PaginationComponent, LoadingSpinnerComponent, PageHeaderComponent, UsersTableComponent],
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css',
})
export class ManageUsers implements OnInit {
  private adminService = inject(AdminService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);

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

  async onPageChange(page: number) {
    this.currentPage = page;
    await this.loadUsers();
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


