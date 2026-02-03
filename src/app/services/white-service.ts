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
    return x
  }

  async acceptProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.domain}/api/ColBlanc/${id}/accepter`, null)
    );
  }

  async refuseProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.domain}/api/ColBlanc/${id}/refuser`, null)
    );
  }

  async assignProblemCitoyen(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.domain}/api/ColBlanc/${id}/assign-citoyens`, null)
    );
  }

  async assignProblemColbleu(id: number, colBleuId: string) {
    return await lastValueFrom(
      this.http.post<any>(`${this.domain}/api/ColBlanc/${id}/assign-colbleu/${colBleuId}`, null)
    );
  }

  async getProblem(id: number): Promise<any> {
    let x = await lastValueFrom(this.http.get<Problem>(this.domain + "/api/ColBlanc/problems/" + id))
    return x
  }
}
