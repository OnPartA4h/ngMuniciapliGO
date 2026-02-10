import { Component, input } from '@angular/core';

import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, NgxMaskDirective],
  templateUrl: './user-form.html',
})
export class UserFormComponent {
  readonly form = input.required<FormGroup>();
  readonly showEmail = input(false);
  readonly emailPlaceholder = input('');
  readonly provinces = input<{
    key: string;
    label: string;
}[]>([]);
  readonly showProvinceDropdown = input(false);

  getError(field: string): boolean {
    const control = this.form().get(field);
    return !!(control?.invalid && control?.touched);
  }

  hasError(field: string, errorType: string): boolean {
    const control = this.form().get(field);
    return !!(control?.hasError(errorType) && control?.touched);
  }
}
