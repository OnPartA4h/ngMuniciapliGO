import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { User } from '../../../models/user';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './delete-confirm-modal.html',
  styleUrl: './delete-confirm-modal.css',
})
export class DeleteConfirmModal {
  @Input() user: User | null = null;
  @Input() isOpen: boolean = false;
  @Input() isLoading: boolean = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
