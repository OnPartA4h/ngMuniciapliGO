import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxMaskPipe } from 'ngx-mask';
import { User, RoleOption } from '../../models/user';
import { AdminService } from '../../services/admin-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { DeleteConfirmModal } from '../delete-confirm-modal/delete-confirm-modal';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, DeleteConfirmModal, NgxMaskPipe],
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
  currentUserId: string | null = null;
  successMessage: string | null = null;

  constructor(
    private adminService: AdminService,
    private generalService: GeneralService,
    private languageService: LanguageService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadRoles();
    this.currentUserId = localStorage.getItem("userId");
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
    this.isLoading = false;
    this.successMessage = null;
    this.close.emit();
  }

  async changeRole(role: RoleOption) {
    if (!this.user || this.isLoading || this.isCurrentUser()) return;

    // If already has this role, do nothing
    if (this.user.roles.includes(role.key)) return;

    try {
      this.isLoading = true;
      const response = await this.adminService.changeRole(this.user.id, role.key);
      
      // Update user roles with the response
      this.user.roles = response.roles;
      
      this.showSuccessMessage();
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private showSuccessMessage() {
    this.successMessage = this.translate.instant('EDIT_USER_MODAL.ROLE_CHANGED', {
      firstName: this.user?.firstName,
      lastName: this.user?.lastName
    });

    setTimeout(() => {
      this.successMessage = null;
      this.cdr.markForCheck();
    }, 3000);
  }

  openDeleteConfirm() {
    if (this.isCurrentUser()) return;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  async confirmDelete() {
    if (!this.user || this.isLoading || this.isCurrentUser()) return;

    try {
      this.isLoading = true;
      await this.adminService.deleteUser(this.user.id);
      this.showDeleteConfirm = false;
      this.isLoading = false;
      this.userDeleted.emit();
      this.close.emit();
    } catch (error) {
      console.error('Error deleting user:', error);
      this.isLoading = false;
    }
  }

  getCurrentRole(): string {
    return this.user?.roles[0] || '';
  }

  isCurrentUser(): boolean {
    return this.user?.id === this.currentUserId;
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
