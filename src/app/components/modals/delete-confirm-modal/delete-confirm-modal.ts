import { Component, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { User } from '../../../models/user';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './delete-confirm-modal.html',
  styleUrl: './delete-confirm-modal.css',
})
export class DeleteConfirmModal {
  readonly user = input<User | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  onConfirm() {
    this.confirm.emit(undefined);
  }

  onCancel() {
    this.cancel.emit(undefined);
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
