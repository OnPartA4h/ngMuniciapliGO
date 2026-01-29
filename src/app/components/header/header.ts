import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { LanguageService } from '../../services/language-service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CommonModule, TranslateModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isConnected: boolean = localStorage.getItem('token') != null;

  constructor(
    public authService: AuthService,
    public languageService: LanguageService
  ) {}

  logout() {
    this.authService.logout();
  }

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }

  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage().toUpperCase();
  }
}
