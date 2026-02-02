import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UpdateProfileDto, User } from '../models/user';
import { lastValueFrom } from 'rxjs';
import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(
    public http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  async getProfile(): Promise<User> {
    const profile = await lastValueFrom(this.http.get<User>(`${this.apiUrl}/api/User/me`));
    // Update the profile picture signal in AuthService
    this.authService.setProfilePictureUrl(profile.profilePictureUrl || null);
    return profile;
  }

  async updateProfile(dto: UpdateProfileDto): Promise<void> {
    await lastValueFrom(this.http.put(`${this.apiUrl}/api/User/me`, dto));
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
