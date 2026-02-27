import { Component, inject } from '@angular/core';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.type" (click)="toastService.remove(toast.id)">
          <div class="toast__icon">
            @switch (toast.type) {
              @case ('success') { <i class="fas fa-check-circle"></i> }
              @case ('error') { <i class="fas fa-exclamation-circle"></i> }
              @case ('warning') { <i class="fas fa-exclamation-triangle"></i> }
              @case ('info') { <i class="fas fa-info-circle"></i> }
            }
          </div>
          <div class="toast__content">
            @if (toast.title) {
              <p class="toast__title">{{ toast.title }}</p>
            }
            <p class="toast__message">{{ toast.message }}</p>
          </div>
          <button class="toast__close" (click)="toastService.remove(toast.id); $event.stopPropagation()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 86px;
      right: var(--spacing-2xl);
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      max-width: 420px;
      width: 100%;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-lg) var(--spacing-xl);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
      animation: toastSlideIn 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      transition: transform var(--transition-fast), opacity var(--transition-fast);
      border-left: 4px solid transparent;
    }

    .toast:hover {
      transform: translateX(-4px);
    }

    .toast--success {
      background: var(--color-white);
      border-left-color: var(--color-success);
    }

    .toast--error {
      background: var(--color-white);
      border-left-color: var(--color-error);
    }

    .toast--warning {
      background: var(--color-white);
      border-left-color: var(--color-warning);
    }

    .toast--info {
      background: var(--color-white);
      border-left-color: var(--color-primary);
    }

    .toast__icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast--success .toast__icon { color: var(--color-success); }
    .toast--error .toast__icon { color: var(--color-error); }
    .toast--warning .toast__icon { color: var(--color-warning); }
    .toast--info .toast__icon { color: var(--color-primary); }

    .toast__content {
      flex: 1;
      min-width: 0;
    }

    .toast__title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0 0 2px 0;
    }

    .toast__message {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    .toast__close {
      background: none;
      border: none;
      color: var(--color-text-tertiary);
      font-size: var(--font-size-sm);
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
      transition: color var(--transition-fast);
    }

    .toast__close:hover {
      color: var(--color-text-primary);
    }

    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        right: var(--spacing-md);
        left: var(--spacing-md);
        max-width: none;
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
