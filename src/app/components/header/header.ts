
import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { LanguageService } from '../../services/language-service';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationBell } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslateModule, NotificationBell],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // Utiliser un computed pour réagir aux changements du signal token
  isConnected = computed(() => !!this.authService.token());
  
  // Computed pour les rôles (pour réactivité complète)
  userRoles = computed(() => this.authService.roles());

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
