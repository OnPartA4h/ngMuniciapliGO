import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-error" *ngIf="control?.touched && control?.invalid && message">
      {{ message }}
    </div>
  `
})
export class FormErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() message = '';
}
