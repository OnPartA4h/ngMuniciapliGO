import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { CreateUserDto, CreateUserResponseDto, PaginatedUsersResponse } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  async getAllUsers(page: number = 1, role?: string, search?: string): Promise<PaginatedUsersResponse> {
    let params = new HttpParams().set('page', page.toString());
    
    if (role) {
      params = params.set('role', role);
    }
    
    if (search) {
      params = params.set('search', search);
    }

    const response = await lastValueFrom(
      this.http.get<PaginatedUsersResponse>(`${this.apiUrl}/api/Admin/users`, { params })
    );
    return response;
  }

  async createUser(userData: CreateUserDto): Promise<CreateUserResponseDto> {
    const response = await lastValueFrom(
      this.http.post<CreateUserResponseDto>(`${this.apiUrl}/api/Admin/users`, userData)
    );
    
    return response;
  }

  async changeRole(userId: string, roleName: string): Promise<{ message?: string; roles: string[] }> {
    return await lastValueFrom(
      this.http.put<{ message?: string; roles: string[] }>(
        `${this.apiUrl}/api/Admin/users/${userId}/change-role`,
        JSON.stringify(roleName),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }

  async deleteUser(userId: string): Promise<void> {
    await lastValueFrom(
      this.http.delete(`${this.apiUrl}/api/Admin/users/${userId}`)
    );
  }
}

