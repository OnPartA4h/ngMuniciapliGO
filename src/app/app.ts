import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './components/header/header';
import { IncomingCallComponent } from './components/incoming-call/incoming-call';
import { ToastComponent } from './components/ui/toast/toast';
import { AuthService } from './services/auth-service';
import { ChatHubService } from './services/chat-hub.service';

import { filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6ze27dtjUYV48z7QU6fkKT63_EKwri8k",
  authDomain: "voxel-f939c.firebaseapp.com",
  databaseURL: "https://voxel-f939c-default-rtdb.firebaseio.com",
  projectId: "voxel-f939c",
  storageBucket: "voxel-f939c.firebasestorage.app",
  messagingSenderId: "614969776355",
  appId: "1:614969776355:web:eef6dfa88fd4c237f00dd6",
  measurementId: "G-0H81XR8P0V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, IncomingCallComponent, ToastComponent],
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
