import { Component, inject, Input, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../services/language-service';

@Component({
    selector: 'app-stat-box',
    standalone: true,
    imports: [TranslateModule, DecimalPipe],
    templateUrl: './stat-box.html',
    styleUrl: './stat-box.css',
})
export class StatBox {
    languageService = inject(LanguageService);
    readonly title = input.required<string>();
    @Input() value!: number;
}
