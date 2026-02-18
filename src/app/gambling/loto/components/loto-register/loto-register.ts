import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LotoService } from '../../services/loto.service';
import { LotoParticipant } from '../../models/loto.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-loto-register',
  standalone: true,
  imports: [ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './loto-register.html',
  styleUrl:    './loto-register.css',
})
export class LotoRegisterComponent {
  private fb      = inject(FormBuilder);
  private svc     = inject(LotoService);
  private snack   = inject(MatSnackBar);

  readonly registered = output<LotoParticipant>();

  readonly Math = Math;

  isLoading = signal(false);
  success   = signal(false);

  form = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    email:   ['', [Validators.required, Validators.email]],
    entries: [1,  [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.isLoading()) return;
    this.isLoading.set(true);

    try {
      const val = this.form.getRawValue();
      const p   = await this.svc.register({
        name:    val.name!,
        email:   val.email!,
        entries: val.entries!,
      });
      this.success.set(true);
      this.registered.emit(p);
      this.snack.open(`🎟️ Welcome, ${p.name}! You have ${p.entries} entr${p.entries > 1 ? 'ies' : 'y'}.`, '🎉', {
        duration:           4000,
        panelClass:         ['loto-snack'],
        horizontalPosition: 'center',
        verticalPosition:   'top',
      });
      this.form.reset({ name: '', email: '', entries: 1 });
      setTimeout(() => this.success.set(false), 3000);
    } catch (e: any) {
      this.snack.open('❌ Registration failed. Please try again.', 'OK', {
        duration: 3000, panelClass: ['loto-snack-error'],
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  get f() { return this.form.controls; }
}
