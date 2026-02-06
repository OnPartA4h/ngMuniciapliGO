import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CategoryOption, Problem } from '../models/problem';
import { environment } from '../../environments/environment';
import { PaginatedProblems } from '../models/paginatedProblems';

@Injectable({
  providedIn: 'root',
})
export class WhiteService {
  private apiUrl = environment.apiUrl;

  constructor(public http: HttpClient) { }

  async getAllProblems(): Promise<PaginatedProblems> {
    let x = await lastValueFrom(this.http.get<PaginatedProblems>(`${this.apiUrl}/api/ColBlanc/problems`))
    console.log(x);
  
    return x
  }

  async acceptProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/ColBlanc/${id}/accepter`, null)
    );
  }

  async refuseProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/ColBlanc/${id}/refuser`, null)
    );
  }

  async assignProblemCitoyen(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/ColBlanc/${id}/assign-citoyens`, null)
    );
  }

  async assignProblemColbleu(id: number, colBleuId: string) {
    return await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/ColBlanc/${id}/assign-colbleu/${colBleuId}`, null)
    );
  }

  async getProblem(id: number): Promise<any> {
    let x = await lastValueFrom(this.http.get<Problem>(`${this.apiUrl}/api/ColBlanc/problems/${id}`))
    return x
  }
}
