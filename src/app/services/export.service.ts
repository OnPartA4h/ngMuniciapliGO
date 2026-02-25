import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Problem } from '../models/problem';
import { GeneralService } from './general-service';
import * as XLSX from 'xlsx';

export type ExportFormat = 'excel' | 'csv' | 'json' | 'pdf';

export interface ExportField {
  key: keyof Problem | 'photo' | 'responsableNom' | 'demandeurNom';
  labelKey: string;
  selected: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  fields: ExportField[];
  dateFrom: string | null;
  dateTo: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private translate = inject(TranslateService);
  private generalService = inject(GeneralService);

  readonly ALL_FIELDS: ExportField[] = [
    { key: 'id',                  labelKey: 'EXPORT.FIELD_ID',           selected: true },
    { key: 'titre',               labelKey: 'EXPORT.FIELD_TITRE',        selected: true },
    { key: 'description',         labelKey: 'EXPORT.FIELD_DESCRIPTION',  selected: true },
    { key: 'address',             labelKey: 'EXPORT.FIELD_ADDRESS',      selected: true },
    { key: 'statut',              labelKey: 'EXPORT.FIELD_STATUT',       selected: true },
    { key: 'categorie',           labelKey: 'EXPORT.FIELD_CATEGORIE',    selected: true },
    { key: 'dateCreation',        labelKey: 'EXPORT.FIELD_DATE_CREATION', selected: true },
    { key: 'dateResolution',      labelKey: 'EXPORT.FIELD_DATE_RESOLUTION', selected: true },
    { key: 'latitude',            labelKey: 'EXPORT.FIELD_LATITUDE',     selected: false },
    { key: 'longitude',           labelKey: 'EXPORT.FIELD_LONGITUDE',    selected: false },
    { key: 'assigneA',            labelKey: 'EXPORT.FIELD_ASSIGNEA',     selected: true },
    { key: 'demandeurNom',        labelKey: 'EXPORT.FIELD_DEMANDEUR',    selected: true },
    { key: 'responsableNom',      labelKey: 'EXPORT.FIELD_RESPONSABLE',  selected: true },
    { key: 'resolutionDescription', labelKey: 'EXPORT.FIELD_RESOLUTION_DESC', selected: false },
    { key: 'rejectionReason',     labelKey: 'EXPORT.FIELD_REJECTION',    selected: false },
    { key: 'nbLikes',             labelKey: 'EXPORT.FIELD_LIKES',        selected: true },
    { key: 'photo',               labelKey: 'EXPORT.FIELD_PHOTO',        selected: true },
  ];

  /** Retourne les champs prêts à être configurés (copie indépendante) */
  getDefaultFields(): ExportField[] {
    return this.ALL_FIELDS.map(f => ({ ...f }));
  }

  /** Filtre les problèmes selon un intervalle de dates */
  filterByDateRange(problems: Problem[], dateFrom: string | null, dateTo: string | null): Problem[] {
    let filtered = [...problems];
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(p => new Date(p.dateCreation) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.dateCreation) <= to);
    }
    return filtered;
  }

  /** Construit les lignes de données à partir des problèmes et des champs sélectionnés */
  private buildRows(problems: Problem[], selectedFields: ExportField[]): Record<string, any>[] {
    return problems.map(p => {
      const row: Record<string, any> = {};
      for (const field of selectedFields) {
        const label = this.translate.instant(field.labelKey);
        switch (field.key) {
          case 'photo':
            row[label] = p.photos && p.photos.length > 0 ? p.photos[0].url : '';
            break;
          case 'demandeurNom':
            row[label] = p.citoyenDemandeur
              ? `${p.citoyenDemandeur.firstName ?? ''} ${p.citoyenDemandeur.lastName ?? ''}`.trim()
              : (p.citoyenDemandeurId ?? '');
            break;
          case 'responsableNom':
            row[label] = p.responsable
              ? `${p.responsable.firstName ?? ''} ${p.responsable.lastName ?? ''}`.trim()
              : '';
            break;
          case 'assigneA':
            row[label] = this.generalService.getAssigneeLabel(p.assigneA);
            break;
          case 'statut':
            row[label] = this.generalService.getStatusLabel(p.statut);
            break;
          case 'categorie':
            row[label] = this.generalService.getCategoryLabel(p.categorie);
            break;
          case 'dateCreation':
          case 'dateResolution':
            row[label] = p[field.key] ? new Date(p[field.key] as Date).toLocaleString() : '';
            break;
          default:
            row[label] = (p as any)[field.key] ?? '';
        }
      }
      return row;
    });
  }

  async export(problems: Problem[], options: ExportOptions): Promise<void> {
    const selectedFields = options.fields.filter(f => f.selected);
    if (selectedFields.length === 0) {
      throw new Error('NO_FIELDS');
    }

    const filtered = this.filterByDateRange(problems, options.dateFrom, options.dateTo);

    switch (options.format) {
      case 'excel': return this.exportExcel(filtered, selectedFields);
      case 'csv':   return this.exportCsv(filtered, selectedFields);
      case 'json':  return this.exportJson(filtered, selectedFields);
      case 'pdf':   return this.exportPdf(filtered, selectedFields);
      default:
        throw new Error('UNSUPPORTED_FORMAT');
    }
  }

  private exportExcel(problems: Problem[], fields: ExportField[]): void {
    const rows = this.buildRows(problems, fields);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Signalements');
    XLSX.writeFile(wb, `export_signalements_${this.dateStamp()}.xlsx`);
  }

  private exportCsv(problems: Problem[], fields: ExportField[]): void {
    const rows = this.buildRows(problems, fields);
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    this.downloadText(csv, `export_signalements_${this.dateStamp()}.csv`, 'text/csv;charset=utf-8;');
  }

  private exportJson(problems: Problem[], fields: ExportField[]): void {
    const rows = this.buildRows(problems, fields);
    const json = JSON.stringify(rows, null, 2);
    this.downloadText(json, `export_signalements_${this.dateStamp()}.json`, 'application/json');
  }

  private async exportPdf(problems: Problem[], fields: ExportField[]): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const title = this.translate.instant('EXPORT.PDF_TITLE');
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`${this.translate.instant('EXPORT.GENERATED_ON')} ${new Date().toLocaleString()}`, 14, 22);

    const headers = fields.map(f => this.translate.instant(f.labelKey));
    const rows = problems.map(p => {
      return fields.map(field => {
        switch (field.key) {
          case 'photo':
            return p.photos && p.photos.length > 0 ? p.photos[0].url : '';
          case 'demandeurNom':
            return p.citoyenDemandeur
              ? `${p.citoyenDemandeur.firstName ?? ''} ${p.citoyenDemandeur.lastName ?? ''}`.trim()
              : (p.citoyenDemandeurId ?? '');
          case 'responsableNom':
            return p.responsable
              ? `${p.responsable.firstName ?? ''} ${p.responsable.lastName ?? ''}`.trim()
              : '';
          case 'assigneA':
            return this.generalService.getAssigneeLabel(p.assigneA);
          case 'statut':
            return this.generalService.getStatusLabel(p.statut);
          case 'categorie':
            return this.generalService.getCategoryLabel(p.categorie);
          case 'dateCreation':
          case 'dateResolution':
            return p[field.key] ? new Date(p[field.key] as Date).toLocaleString() : '';
          default:
            return String((p as any)[field.key] ?? '');
        }
      });
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });

    doc.save(`export_signalements_${this.dateStamp()}.pdf`);
  }

  private downloadText(content: string, filename: string, mimeType: string): void {
    const bom = mimeType.includes('csv') ? '\uFEFF' : '';
    const blob = new Blob([bom + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
