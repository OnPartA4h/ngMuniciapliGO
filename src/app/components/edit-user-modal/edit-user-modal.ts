import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, RoleOption } from '../../models/user';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edit-user-modal.html',
  styleUrl: './edit-user-modal.css',
})
export class EditUserModal implements OnInit, OnChanges {
  @Input() user: User | null = null;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() userDeleted = new EventEmitter<void>();

  roles: RoleOption[] = [];
  isLoading = false;
  showDeleteConfirm = false;

  constructor(
    private adminService: AdminService,
    private generalService: GeneralService,
    private languageService: LanguageService
  ) {}

  async ngOnInit() {
    await this.loadRoles();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      await this.loadRoles();
    }
  }

  async loadRoles() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.roles = await this.generalService.getRoles(lang);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  closeModal() {
    this.showDeleteConfirm = false;
    this.isLoading = false; // Reset loading state
    this.close.emit();
  }

  async toggleRole(role: RoleOption) {
    if (!this.user || this.isLoading) return;

    try {
      this.isLoading = true;
      const hasRole = this.user.roles.includes(role.key);

      if (hasRole) {
        await this.adminService.removeRole(this.user.id, role.key);
        this.user.roles = this.user.roles.filter(r => r !== role.key);
      } else {
        await this.adminService.assignRole(this.user.id, role.key);
        this.user.roles.push(role.key);
      }
    } catch (error) {
      console.error('Error toggling role:', error);
    } finally {
      this.isLoading = false;
    }
  }

  openDeleteConfirm() {
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  async confirmDelete() {
    if (!this.user || this.isLoading) return;

    try {
      this.isLoading = true;
      await this.adminService.deleteUser(this.user.id);
      this.showDeleteConfirm = false;
      this.isLoading = false; // Reset before emitting
      this.userDeleted.emit();
      this.close.emit();
    } catch (error) {
      console.error('Error deleting user:', error);
      this.isLoading = false;
    }
  }

  hasRole(role: string): boolean {
    return this.user?.roles.includes(role) || false;
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
