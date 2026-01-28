import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  domain = "https://localhost:7288"
  //domain = "https://municipaligo.onrender.com"

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
  }

  logout() {
    localStorage.removeItem("token")
  }

}
