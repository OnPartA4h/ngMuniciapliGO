import { HttpClient } from '@angular/common/http';
import { Injectable, signal, Signal, WritableSignal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationHubService } from './notification-hub.service';
import { ChatHubService } from './chat-hub.service';
import { CallHubService } from './call-hub.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = environment.apiUrl;

  private tokenSignal : WritableSignal<string|null> = signal(localStorage.getItem("token"));
  readonly token : Signal<string|null> = this.tokenSignal.asReadonly();

  private rolesSignal : WritableSignal<string[]> = signal(
    localStorage.getItem("roles") ? JSON.parse(localStorage.getItem("roles")!) : []
  );
  readonly roles : Signal<string[]> = this.rolesSignal.asReadonly();

  private profilePictureSignal : WritableSignal<string|null> = signal(localStorage.getItem("profilePictureUrl"));
  readonly profilePictureUrl : Signal<string|null> = this.profilePictureSignal.asReadonly();

  private loginResponse: any = null;
  private notificationHubService = inject(NotificationHubService);
  private chatHubService = inject(ChatHubService);
  private callHubService = inject(CallHubService);

  async login(email: string, password: string) {
    const dto = {
      email: email,
      password: password
    };

    const response = await lastValueFrom(this.http.post<any>(`${this.apiUrl}/api/Auth/login`, dto));
      console.log(response);

      const roles: string[] = response.user.roles;

      this.updateSignals(response)

      // Update profile picture signal from login response
      const pfpUrl = response.user.profilePictureUrl || null;
      this.profilePictureSignal.set(pfpUrl);
      if (pfpUrl) {
        localStorage.setItem("profilePictureUrl", pfpUrl);
      } else {
        localStorage.removeItem("profilePictureUrl");
      }

      // Store the login response for mustResetPassword check
      this.loginResponse = response;
  }

  updateSignals(data: any) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("roles", JSON.stringify(data.user.roles))
    localStorage.setItem("userId", data.user.id)
    this.tokenSignal.set(data.token)
    this.rolesSignal.set(data.user.roles)
  }

  isAuthenticated(): boolean {
    return this.tokenSignal() !== null;
  }

  async connectToNotificationHub(): Promise<void> {
    const token = this.tokenSignal();
    if (!token) {
      console.warn('No token available for SignalR connection');
      return;
    }

    try {
      await this.notificationHubService.startConnection(token);
      await this.chatHubService.startConnection(token);
      await this.callHubService.startConnection(token);
    } catch (error) {
      console.error('Failed to connect to SignalR hubs:', error);
    }
  }

  setProfilePictureUrl(url: string | null) {
    this.profilePictureSignal.set(url);
    if (url) {
      localStorage.setItem("profilePictureUrl", url);
    } else {
      localStorage.removeItem("profilePictureUrl");
    }
  }

  getLoginResponse() {
    return this.loginResponse;
  }

  async forgotPassword(email: string): Promise<void> {
    const dto = { email };
    let res = await lastValueFrom(
      this.http.post<void>(`${this.apiUrl}/api/Auth/forgot-password`, dto)
    );
    console.log(res);
    
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("roles")
    localStorage.removeItem("userId")
    localStorage.removeItem("profilePictureUrl")
    
    this.tokenSignal.set(null)
    this.rolesSignal.set([])
    this.profilePictureSignal.set(null)
    this.loginResponse = null

    // Disconnect from SignalR
    this.notificationHubService.stopConnection().catch(err => {
      console.error('Error disconnecting from notification hub:', err);
    });
    this.chatHubService.stopConnection().catch(err => {
      console.error('Error disconnecting from chat hub:', err);
    });
    this.callHubService.stopConnection().catch(err => {
      console.error('Error disconnecting from call hub:', err);
    });

    this.router.navigate(['/login']);
  }
}
