import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(type: Toast['type'], message: string, title?: string, duration = 4000): void {
    const id = this.nextId++;
    const toast: Toast = { id, type, message, title, duration };
    this.toasts.update(t => [...t, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, title?: string): void {
    this.show('success', message, title);
  }

  error(message: string, title?: string): void {
    this.show('error', message, title, 6000);
  }

  warning(message: string, title?: string): void {
    this.show('warning', message, title, 5000);
  }

  info(message: string, title?: string): void {
    this.show('info', message, title);
  }

  remove(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
