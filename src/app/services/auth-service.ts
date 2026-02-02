import { HttpClient } from '@angular/common/http';
import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { UpdateProfileDto, User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private tokenSignal : WritableSignal<string|null> = signal(localStorage.getItem("token"));
  readonly token : Signal<string|null> = this.tokenSignal.asReadonly();

  private rolesSignal : WritableSignal<string[]> = signal(
    localStorage.getItem("roles") ? JSON.parse(localStorage.getItem("roles")!) : []
  );
  readonly roles : Signal<string[]> = this.rolesSignal.asReadonly();

  private profilePictureSignal : WritableSignal<string|null> = signal(null);
  readonly profilePictureUrl : Signal<string|null> = this.profilePictureSignal.asReadonly();

  private loginResponse: any = null;

  constructor(public http: HttpClient, private router: Router) {}

  errorMessage: string = ""

  async login(email: string, password: string) {
    const dto = {
      email: email,
      password: password
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(`${this.apiUrl}/api/Auth/login`, dto));
      console.log(response);

      const roles: string[] = response.user.roles;

      if (!roles.includes("Admin") && !roles.includes("ColBlanc")) {
        console.log("NOT ADMIN OR COL BLANC!!!!");
        this.errorMessage = "NOT ADMIN OR COL BLANC!!!!"
        return;
      }

      localStorage.setItem("token", response.token);
      this.tokenSignal.set(response.token)

      localStorage.setItem("roles", JSON.stringify(response.user.roles))
      this.rolesSignal.set(response.user.roles)

      // Update profile picture signal from login response
      this.profilePictureSignal.set(response.user.profilePictureUrl || null);

      // Store the login response for mustResetPassword check
      this.loginResponse = response;
    } catch (error: any) {
      if (error.status < 500 && error.status > 0) {
        this.errorMessage = "Email or password is incorrect"
      } else {
        this.errorMessage = "Erreur serveur. Veuillez réessayer plus tard."
      }
    }
  }

  isAuthenticated(): boolean {
    return this.tokenSignal() !== null;
  }

  setProfilePictureUrl(url: string | null) {
    this.profilePictureSignal.set(url);
  }

  getLoginResponse() {
    return this.loginResponse;
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("roles")
    
    this.tokenSignal.set(null)
    this.rolesSignal.set([])
    this.profilePictureSignal.set(null)
    this.loginResponse = null

    this.router.navigate(['/login']);
  }
}
