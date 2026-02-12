import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './components/header/header';

import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  private router = inject(Router);

  showHeaderFooter = true;
  private hiddenRoutes = ['/login'];

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showHeaderFooter = !this.hiddenRoutes.includes(event.urlAfterRedirects);
      });
  }
}
