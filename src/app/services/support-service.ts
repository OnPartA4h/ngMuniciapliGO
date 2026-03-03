import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';
import { Problem } from '../models/problem';
import { HttpClient } from '@angular/common/http';
import { PhoneCall } from '../models/phoneCall';
import { UpdateUserDto, User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  async getProblems(options?: any): Promise<Problem[]> {
    let res = await lastValueFrom(this.http.get<Problem[]>(`${this.apiUrl}/api/Support/GetProblemes`, { params: options as any }));
    console.log(res);
    
    return res;
  }

  async getProblem(id: number): Promise<Problem> {
    let res = await lastValueFrom(this.http.get<Problem>(`${this.apiUrl}/api/Support/GetProblem/${id}`));
    console.log(res);
    return res;
  }

  async getPhoneCall(): Promise<PhoneCall | null> {
    try {
      let res = await lastValueFrom(this.http.get<PhoneCall>(`${this.apiUrl}/api/Support/GetPhoneCall`))
      console.log(res);
      return res;
    } catch {
      return null;
    }
  }

  async endCall(id: number) {
    let res = await lastValueFrom(this.http.delete<any>(`${this.apiUrl}/api/Support/DeletePhoneCall/${id}`))
    console.log(res);
  }

  async addUserToCall(id: number, email: string): Promise<PhoneCall> {
    let dto = {
      callId: id,
      email: email
    }
    let res = await lastValueFrom(this.http.post<PhoneCall>(`${this.apiUrl}/api/Support/AddUserToCall`, dto))
    console.log(res);
    
    return res
  }

  async updateUserProfile(userId: string, dto: UpdateUserDto): Promise<{ message: string; user: User }> {
    return lastValueFrom(
      this.http.put<{ message: string; user: User }>(`${this.apiUrl}/api/Support/UpdateUserProfile/${userId}`, dto)
    );
  }

  async changeUserEmail(userId: string, newEmail: string): Promise<{ message: string; user: User }> {
    return lastValueFrom(
      this.http.put<{ message: string; user: User }>(`${this.apiUrl}/api/Support/ChangeUserEmail/${userId}`, { newEmail })
    );
  }

  async changeUserProfilePicture(userId: string, file: File): Promise<{ message: string; profilePictureUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return lastValueFrom(
      this.http.post<{ message: string; profilePictureUrl: string }>(`${this.apiUrl}/api/Support/ChangeUserProfilePicture/${userId}`, formData)
    );
  }

}
