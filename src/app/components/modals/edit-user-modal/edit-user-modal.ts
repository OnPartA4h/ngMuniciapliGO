import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxMaskPipe } from 'ngx-mask';
import { User, RoleOption } from '../../../models/user';
import { AdminService } from '../../../services/admin-service';
import { GeneralService } from '../../../services/general-service';
import { LanguageService } from '../../../services/language-service';
import { DeleteConfirmModal } from '../delete-confirm-modal/delete-confirm-modal';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [TranslateModule, DeleteConfirmModal, NgxMaskPipe],
  templateUrl: './edit-user-modal.html',
  styleUrl: './edit-user-modal.css',
})
export class EditUserModal implements OnInit {
  private adminService = inject(AdminService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);

  readonly user = input<User | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly close = output<void>();
  readonly userDeleted = output<void>();

  roles = signal<RoleOption[]>([]);
  isLoading = signal(false);
  showDeleteConfirm = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  deleteErrorMessage = signal<string | null>(null);
  currentUserId = signal<string | null>(null);

  ngOnInit() {
    const userId = localStorage.getItem('userId');
    this.currentUserId.set(userId);
    this.loadRoles();
  }

  private async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      const rolesData = await this.generalService.getRoles(lang);
      this.roles.set(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  closeModal() {
    this.showDeleteConfirm.set(false);
    this.isLoading.set(false);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.deleteErrorMessage.set(null);
    this.close.emit(undefined);
  }

  async changeRole(role: RoleOption) {
    const user = this.user();
    if (!user || this.isLoading() || this.isCurrentUser()) return;
    if (user.roles.includes(role.key)) return;

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.adminService.changeRole(user.id, role.key);
      user.roles = response.roles;
      this.displaySuccessMessage(user);
    } catch (error: any) {
      console.error('Error changing role:', error);
      const isOffline = !navigator.onLine || error?.status === 0;
      this.errorMessage.set(
        this.translate.instant(isOffline ? 'COMMON.ERROR_OFFLINE' : 'COMMON.ERROR_GENERIC')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private displaySuccessMessage(user: User) {
    const message = this.translate.instant('EDIT_USER_MODAL.ROLE_CHANGED', {
      firstName: user.firstName,
      lastName: user.lastName
    });
    this.successMessage.set(message);

    setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }

  openDeleteConfirm() {
    if (this.isCurrentUser()) return;
    this.deleteErrorMessage.set(null);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.deleteErrorMessage.set(null);
  }

  async confirmDelete() {
    const user = this.user();
    if (!user || this.isLoading() || this.isCurrentUser()) return;

    try {
      this.isLoading.set(true);
      this.deleteErrorMessage.set(null);
      await this.adminService.deleteUser(user.id);
      this.userDeleted.emit(undefined);
      this.closeModal();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const isOffline = !navigator.onLine || error?.status === 0;
      this.deleteErrorMessage.set(
        this.translate.instant(isOffline ? 'COMMON.ERROR_OFFLINE' : 'COMMON.ERROR_GENERIC')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  getCurrentRole(): string {
    return this.user()?.roles[0] ?? '';
  }

  isCurrentUser(): boolean {
    return this.user()?.id === this.currentUserId();
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
