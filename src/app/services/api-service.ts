import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { helloWorld } from '../models/helloWorld';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  domain = "https://localhost:7288"
  //domain = "https://municipaligo.onrender.com"

  constructor(public http: HttpClient) {}

  async helloWorld(): Promise<string> {
    let x = await lastValueFrom(this.http.get<helloWorld>(this.domain + "/api/Hello"))
    console.log(x);

    return x.text;
  }

  async getProblem(id: number): Promise<any> {
    let x = await lastValueFrom(this.http.get<any>(this.domain + "/api/general/problem/" + id))
    console.log(x);

    return x;
  }
}
