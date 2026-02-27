import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WhiteService } from '../../services/white-service';
import { PageHeaderComponent, FormErrorComponent, ToastService } from '../../components/ui';
import { CreateDuplicateGroupDTO } from '../../models/duplicate-group';

@Component({
  selector: 'app-create-duplicate-group',
  imports: [TranslateModule, FormsModule, PageHeaderComponent, FormErrorComponent],
  templateUrl: './create-duplicate-group.html',
  styleUrl: './create-duplicate-group.css',
})
export class CreateDuplicateGroup {
  private whiteService = inject(WhiteService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  readonly name = signal('');
  readonly aiReasonFR = signal('');
  readonly aiReasonEN = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  isFormValid(): boolean {
    return this.name().trim().length > 0;
  }

  async submit() {
    if (!this.isFormValid()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      let dto:CreateDuplicateGroupDTO = {
        name: this.name().trim(),
        aiReasonFR: this.aiReasonFR().trim(),
        aiReasonEN: this.aiReasonEN().trim(),
      };
      await this.whiteService.createDuplicateGroup(dto);
      this.toast.success(this.translate.instant('CREATE_DUPLICATE_GROUP.SUCCESS'));
      this.router.navigate(['/manage-duplicates']);
    } catch (e: any) {
      this.errorMessage.set(e?.error?.message || this.translate.instant('CREATE_DUPLICATE_GROUP.ERROR'));
      this.toast.error(this.translate.instant('CREATE_DUPLICATE_GROUP.ERROR'));
      this.loading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/manage-duplicates']);
  }
}
