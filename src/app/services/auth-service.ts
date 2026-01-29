import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(public http: HttpClient) {}

  async login(email: string, password: string) {
    const dto = {
      email: email,
      password: password
    };

    const response = await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/Auth/login`, dto)
    );
    console.log(response);

    const roles: string[] = response.user.roles;

    if (!roles.includes("Admin") && !roles.includes("ColBlanc")) {
      console.log("NOT ADMIN OR COL BLANC!!!!");
      return;
    }

    localStorage.setItem("token", response.token);
  }

  logout() {
    localStorage.removeItem("token");
  }
}
