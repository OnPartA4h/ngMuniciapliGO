import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UpdateUserDto, ChangePasswordDto, RequestEmailChangeDto, VerifyEmailChangeDto, User } from '../models/user';
import { lastValueFrom } from 'rxjs';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  private apiUrl = environment.apiUrl;

  async getProfile(): Promise<User> {
    const profile = await lastValueFrom(this.http.get<User>(`${this.apiUrl}/api/User/me`));
    // Update the profile picture signal in AuthService
    this.authService.setProfilePictureUrl(profile.profilePictureUrl || null);
    return profile;
  }

  async updateUser(dto: UpdateUserDto): Promise<{ message: string; user: User }> {
    const response = await lastValueFrom(
      this.http.put<{ message: string; user: User }>(`${this.apiUrl}/api/User/me`, dto)
    );
    return response;
  }

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    const response = await lastValueFrom(
      this.http.post<{ message: string }>(`${this.apiUrl}/api/User/change-password`, dto)
    );
    return response;
  }

  async requestEmailChange(dto: RequestEmailChangeDto): Promise<{ message: string }> {
    const response = await lastValueFrom(
      this.http.post<{ message: string }>(`${this.apiUrl}/api/User/request-email-change`, dto)
    );
    return response;
  }

  async verifyEmailChange(dto: VerifyEmailChangeDto): Promise<{ message: string }> {
    const response = await lastValueFrom(
      this.http.post<{ message: string }>(`${this.apiUrl}/api/User/verify-email-change`, dto)
    );
    return response;
  }

  async resendEmailChangeCode(): Promise<{ message: string }> {
    const response = await lastValueFrom(
      this.http.post<{ message: string }>(`${this.apiUrl}/api/User/resend-email-change-code`, {})
    );
    return response;
  }

  async uploadProfilePicture(file: File): Promise<{ message: string; profilePictureUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await lastValueFrom(this.http.post<{ message: string; profilePictureUrl: string }>(`${this.apiUrl}/api/User/profile-picture`, formData));
    // Update the profile picture signal in AuthService
    this.authService.setProfilePictureUrl(response.profilePictureUrl);
    return response;
  }

  async deleteProfilePicture(): Promise<{ message: string }> {
    const response = await lastValueFrom(this.http.delete<{ message: string }>(`${this.apiUrl}/api/User/profile-picture`));
    // Clear the profile picture signal in AuthService
    this.authService.setProfilePictureUrl(null);
    return response;
  }

  async getColBleus(search: string): Promise<any> {
    if (search == "") return;

    let x = await lastValueFrom(this.http.get<any>(`${this.apiUrl}/api/User/colbleus/${search}`));

    return x;
  }
}
