import { HttpClient } from '@angular/common/http';
import { Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  domain = "https://localhost:7288"
  //domain = "https://municipaligo.onrender.com"

  private tokenSignal : WritableSignal<string|null> = signal(localStorage.getItem("token"));
  readonly token : Signal<string|null> = this.tokenSignal.asReadonly();

  private rolesSignal : WritableSignal<string[]> = signal(
    localStorage.getItem("roles") ? JSON.parse(localStorage.getItem("roles")!) : []
  );
  readonly roles : Signal<string[]> = this.rolesSignal.asReadonly();

  constructor(public http: HttpClient) {}

  async login(email: string, password: string) {
    let dto = {
      email: email,
      password: password
    }

    let x = await lastValueFrom(this.http.post<any>(this.domain + "/api/Auth/login", dto))
    console.log(x);

    let roles: string[] = x.user.roles

    if (!roles.includes("Admin")) {
      console.log("NOT ADMIN!!!!");
      return
    }

    localStorage.setItem("token", x.token)
    this.tokenSignal.set(x.token)

    localStorage.setItem("roles", JSON.stringify(x.user.roles))
    this.rolesSignal.set(x.user.roles)
  }

  logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("roles")
    
    this.tokenSignal.set(null)
    this.rolesSignal.set([])
  }

}
