import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { LanguageService } from '../../services/language-service';
import { ActiveCallService } from '../../services/active-call.service';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationBell } from '../notification-bell/notification-bell';
import { ChatBell } from '../chat-bell/chat-bell';
import { environment } from '../../../environments/environment';
import { assetUrl } from '../../app.config';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslateModule, NotificationBell, ChatBell],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);
  languageService = inject(LanguageService);
  activeCallService = inject(ActiveCallService);
  private router = inject(Router);

  logoUrl = assetUrl('assets/images/Logo.png');

  // Utiliser un computed pour réagir aux changements du signal token
  isConnected = computed(() => !!this.authService.token());

  // Computed pour les rôles (pour réactivité complète)
  userRoles = computed(() => this.authService.roles());

  logout() {
    this.authService.logout();
  }

  toggleLanguage() {
    this.languageService.toggleLanguage();
  }

  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage().toUpperCase();
  }

  openVitrine() {
    const token = this.authService.token();
    const url = `${environment.vitrineUrl}/?token=${encodeURIComponent(token ?? '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  focusCall(): void {
    this.activeCallService.focusCallWindow();
  }

  formatCallDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private clickCount = 0;
  private firstClickTime = 0;

  onHeaderClick() {
    const now = Date.now();
    if (this.clickCount === 0) {
      this.firstClickTime = now;
    }
    this.clickCount++;
    if (this.clickCount === 5 && (now - this.firstClickTime) <= 2000) {
      this.clickCount = 0;
      this.firstClickTime = 0;
      this.router.navigate(['/voxel']);
    } else if ((now - this.firstClickTime) > 2000) {
      this.clickCount = 1;
      this.firstClickTime = now;
    }
  }
}
