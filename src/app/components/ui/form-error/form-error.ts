import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-error',
  standalone: true,
  template: `
    @if (control?.touched && control?.invalid && message) {
      <div class="form-error">{{ message }}</div>
    }
  `
})
export class FormErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() message = '';
}
