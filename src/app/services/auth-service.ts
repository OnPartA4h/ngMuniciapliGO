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
    } catch (error: any) {
      if (error.status < 500 && error.status > 0) {
        this.errorMessage = "Email or password is incorrect"
      } else {
        this.errorMessage = "Erreur serveur. Veuillez réessayer plus tard."
      }
    }
  }

  async getProfile(): Promise<User> {
    const profile = await lastValueFrom(this.http.get<User>(`${this.apiUrl}/api/Auth/me`));
    // Update the profile picture signal
    this.profilePictureSignal.set(profile.profilePictureUrl || null);
    return profile;
  }

  async updateProfile(dto: UpdateProfileDto): Promise<void> {
    await lastValueFrom(this.http.put(`${this.apiUrl}/api/Auth/me`, dto));
  }

  async uploadProfilePicture(file: File): Promise<{ message: string; profilePictureUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await lastValueFrom(this.http.post<{ message: string; profilePictureUrl: string }>(`${this.apiUrl}/api/Auth/profile-picture`, formData));
    // Update the profile picture signal
    this.profilePictureSignal.set(response.profilePictureUrl);
    return response;
  }

  async deleteProfilePicture(): Promise<{ message: string }> {
    const response = await lastValueFrom(this.http.delete<{ message: string }>(`${this.apiUrl}/api/Auth/profile-picture`));
    // Clear the profile picture signal
    this.profilePictureSignal.set(null);
    return response;
  }

  isAuthenticated(): boolean {
    return this.tokenSignal() !== null;
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("roles")
    
    this.tokenSignal.set(null)
    this.rolesSignal.set([])
    this.profilePictureSignal.set(null)

    this.router.navigate(['/login']);
  }
}
