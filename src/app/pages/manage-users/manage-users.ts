import { Component, OnInit, inject, signal } from '@angular/core';

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

  users = signal<User[]>([]);
  availableRoles = signal<RoleOption[]>([]);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(50);
  totalPages = signal(1);
  totalUsers = signal(0);

  // Filters
  searchQuery = signal('');
  selectedRole = signal('');

  // Modal state
  showEditModal = signal(false);
  selectedUser = signal<User | null>(null);

  // Loading state
  isLoading = signal(false);

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
      const rolesData = await this.generalService.getRoles(lang);
      this.availableRoles.set(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  async loadUsers() {
    try {
      this.isLoading.set(true);
      const response = await this.adminService.getAllUsers(
        this.currentPage(),
        this.selectedRole() || undefined,
        this.searchQuery() || undefined
      );

      this.users.set(response.items);
      this.currentPage.set(response.pagination.currentPage);
      this.pageSize.set(response.pagination.pageSize);
      this.totalPages.set(response.pagination.totalPages);
      this.totalUsers.set(response.pagination.totalCount);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSearch() {
    this.currentPage.set(1);
    await this.loadUsers();
  }

  async onRoleFilterChange() {
    this.currentPage.set(1);
    await this.loadUsers();
  }

  async nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      await this.loadUsers();
    }
  }

  async previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      await this.loadUsers();
    }
  }

  async onPageChange(page: number) {
    this.currentPage.set(page);
    await this.loadUsers();
  }

  openEditModal(user: User) {
    this.selectedUser.set(user);
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.selectedUser.set(null);
    this.showEditModal.set(false);
  }

  async onUserDeleted() {
    this.closeEditModal();
    await this.loadUsers();
  }

  getRoleLabel(roleKey: string): string {
    const role = this.availableRoles().find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }
}


