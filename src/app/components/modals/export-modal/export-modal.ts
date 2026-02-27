import { Component, input, output, inject, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { Problem } from '../../../models/problem';
import { ExportService, ExportField, ExportFormat, ExportOptions } from '../../../services/export.service';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './export-modal.html',
  styleUrl: './export-modal.css',
})
export class ExportModalComponent implements OnChanges, OnDestroy {
  readonly isOpen   = input<boolean>(false);
  readonly problems = input<Problem[]>([]);
  readonly close    = output<void>();

  private exportService = inject(ExportService);
  private cdr = inject(ChangeDetectorRef);

  readonly SUPPORTED_FORMATS: ExportFormat[] = ['excel', 'csv', 'json', 'pdf'];

  selectedFormat: ExportFormat = 'excel';
  dateFrom: string = '';
  dateTo: string = '';
  fields: ExportField[] = [];
  isExporting = false;
  errorKey: string | null = null;
  successKey: string | null = null;

  ngOnChanges() {
    if (this.isOpen()) {
      this.reset();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  reset() {
    this.selectedFormat = 'excel';
    this.dateFrom = '';
    this.dateTo = '';
    this.fields = this.exportService.getDefaultFields();
    this.isExporting = false;
    this.errorKey = null;
    this.successKey = null;
  }

  get filteredCount(): number {
    return this.exportService.filterByDateRange(
      this.problems(),
      this.dateFrom || null,
      this.dateTo || null
    ).length;
  }

  get selectedFieldsCount(): number {
    return this.fields.filter(f => f.selected).length;
  }

  selectAllFields() {
    this.fields.forEach(f => (f.selected = true));
  }

  deselectAllFields() {
    this.fields.forEach(f => (f.selected = false));
  }

  async doExport() {
    this.errorKey = null;
    this.successKey = null;

    if (!this.SUPPORTED_FORMATS.includes(this.selectedFormat)) {
      this.errorKey = 'EXPORT.ERROR_UNSUPPORTED_FORMAT';
      return;
    }
    if (this.fields.filter(f => f.selected).length === 0) {
      this.errorKey = 'EXPORT.ERROR_NO_FIELDS';
      return;
    }

    const options: ExportOptions = {
      format: this.selectedFormat,
      fields: this.fields,
      dateFrom: this.dateFrom || null,
      dateTo: this.dateTo || null,
    };

    try {
      this.isExporting = true;
      await this.exportService.export(this.problems(), options);
      this.successKey = 'EXPORT.SUCCESS';
    } catch (e: any) {
      if (e?.message === 'UNSUPPORTED_FORMAT') {
        this.errorKey = 'EXPORT.ERROR_UNSUPPORTED_FORMAT';
      } else if (e?.message === 'NO_FIELDS') {
        this.errorKey = 'EXPORT.ERROR_NO_FIELDS';
      } else {
        this.errorKey = 'EXPORT.ERROR_GENERIC';
      }
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('export-modal-backdrop')) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
  }
}
