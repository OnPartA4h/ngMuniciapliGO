import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './components/header/header';
import { IncomingCallComponent } from './components/incoming-call/incoming-call';
import { AuthService } from './services/auth-service';
import { ChatHubService } from './services/chat-hub.service';

import { filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, IncomingCallComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatHubService = inject(ChatHubService);
  private destroy$ = new Subject<void>();

  showHeaderFooter = true;
  private hiddenRoutes = ['/login', '/call'];

  ngOnInit() {
    // Establish SignalR connections on app initialization if user is authenticated
    if (this.authService.isAuthenticated()) {
      const token = this.authService.token();
      if (token) {
        this.authService.connectToNotificationHub();
        this.chatHubService.startConnection(token).catch(err =>
          console.error('Failed to connect to chat hub on reload:', err)
        );
      }
    }

    // Check the initial URL immediately (before first NavigationEnd fires)
    const initialUrl = this.router.url.split('?')[0];
    this.showHeaderFooter = !this.hiddenRoutes.some(r => initialUrl.startsWith(r));

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects.split('?')[0]; // strip query params
        this.showHeaderFooter = !this.hiddenRoutes.some(r => url.startsWith(r));
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
