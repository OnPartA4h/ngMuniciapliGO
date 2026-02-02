import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Problem } from '../models/problem';

@Injectable({
  providedIn: 'root',
})
export class WhiteService {
  domain = "https://localhost:7288"
  //domain = "https://municipaligo.onrender.com"

  constructor(public http: HttpClient) { }

  async getAllProblems(): Promise<Problem[]> {
    let x = await lastValueFrom(this.http.get<Problem[]>(this.domain + "/api/ColBlanc/problems"))
    console.log(x);
    return x
  }

  async acceptProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(`${this.domain}/api/ColBlanc/accept/${id}`)
    );
  }

  async refuseProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(`${this.domain}/api/ColBlanc/refuser/${id}`)
    );
  }

  async assignProblem(id: number, colBleuId: string | null = null): Promise<any> {
    if (colBleuId) {
      return await lastValueFrom(
        this.http.get<any>(`${this.domain}/api/ColBlanc/assign/${id}/${colBleuId}`)
      );
    }
    return await lastValueFrom(
      this.http.get<any>(`${this.domain}/api/ColBlanc/assign/${id}`)
    );
  }
}
