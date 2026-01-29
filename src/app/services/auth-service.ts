import { HttpClient } from '@angular/common/http';
import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

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
    this.tokenSignal.set(response.token)

    localStorage.setItem("roles", JSON.stringify(response.user.roles))
    this.rolesSignal.set(response.user.roles)
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("roles")
    
    this.tokenSignal.set(null)
    this.rolesSignal.set([])
  }
}
