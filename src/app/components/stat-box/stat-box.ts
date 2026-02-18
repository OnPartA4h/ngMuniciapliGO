import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../services/language-service';

@Component({
    selector: 'app-stat-box',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './stat-box.html',
    styleUrl: './stat-box.css',
})
export class StatBox {
    languageService = inject(LanguageService);
    @Input() title!: string;
    @Input() value!: number;
}
