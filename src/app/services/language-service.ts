import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = 'app_language';
  private readonly SUPPORTED_LANGUAGES = ['fr', 'en'];
  private readonly DEFAULT_LANGUAGE = 'fr';

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  /**
   * Initialize language based on priority:
   * 1. LocalStorage
   * 2. Browser language
   * 3. Default (French)
   */
  private initializeLanguage(): void {
    let language = localStorage.getItem(this.STORAGE_KEY);

    if (!language) {
      const browserLang = this.translate.getBrowserLang();
      language = browserLang ? browserLang.substring(0, 2) : '';
    }

    if (!language || !this.SUPPORTED_LANGUAGES.includes(language)) {
      language = this.DEFAULT_LANGUAGE;
    }

    this.setLanguage(language);
  }

  setLanguage(lang: string): void {
    if (this.SUPPORTED_LANGUAGES.includes(lang)) {
      this.translate.use(lang);
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang || this.DEFAULT_LANGUAGE;
  }

  onLangChange() {
    return this.translate.onLangChange;
  }

  toggleLanguage(): void {
    const currentLang = this.getCurrentLanguage();
    const newLang = currentLang === 'fr' ? 'en' : 'fr';
    this.setLanguage(newLang);
  }

  getSupportedLanguages(): string[] {
    return [...this.SUPPORTED_LANGUAGES];
  }
}
