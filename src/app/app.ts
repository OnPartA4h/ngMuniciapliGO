import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './components/header/header';
import { AuthService } from './services/auth-service';

import { filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  showHeaderFooter = true;
  private hiddenRoutes = ['/login'];

  ngOnInit() {
    // Establish SignalR connection on app initialization if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.authService.connectToNotificationHub();
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showHeaderFooter = !this.hiddenRoutes.includes(event.urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
