import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModalComponent {
  readonly isOpen     = input<boolean>(false);
  readonly isLoading  = input<boolean>(false);
  readonly title      = input<string>('');
  readonly message    = input<string>('');
  readonly confirmLabel = input<string>('COMMON.YES');
  readonly cancelLabel  = input<string>('COMMON.CANCEL');
  readonly confirmClass = input<string>('btn-danger');

  readonly confirm = output<void>();
  readonly cancel  = output<void>();

  onConfirm() { this.confirm.emit(); }
  onCancel()  { this.cancel.emit();  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
