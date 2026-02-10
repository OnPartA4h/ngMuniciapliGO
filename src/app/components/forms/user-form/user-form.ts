import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, NgxMaskDirective],
  templateUrl: './user-form.html',
})
export class UserFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() showEmail = false;
  @Input() emailPlaceholder = '';
  @Input() provinces: { key: string; label: string }[] = [];
  @Input() showProvinceDropdown = false;

  getError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }

  hasError(field: string, errorType: string): boolean {
    const control = this.form.get(field);
    return !!(control?.hasError(errorType) && control?.touched);
  }
}
