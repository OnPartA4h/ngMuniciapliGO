import { Component, input, output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { DuplicateGroup } from '../../../models/duplicate-group';
import { LanguageService } from '../../../services/language-service';

@Component({
  selector: 'app-duplicate-group-card',
  standalone: true,
  imports: [TranslateModule, DatePipe],
  templateUrl: './duplicate-group-card.html',
  styleUrl: './duplicate-group-card.css'
})
export class DuplicateGroupCardComponent {
  private languageService = inject(LanguageService);

  readonly group = input.required<DuplicateGroup>();
  readonly isExpanded = input(false);
  readonly isDragOver = input(false);
  readonly toggleExpanded = output<void>();

  onToggle() {
    this.toggleExpanded.emit();
  }

  getAiReason(): string {
    const lang = this.languageService.getCurrentLanguage();
    const g = this.group();
    return lang === 'fr' ? (g.aiReasonFR || '') : (g.aiReasonEN || '');
  }
}