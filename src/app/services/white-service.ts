import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AssigneAOption, CategoryOption, Problem, StatusOption } from '../models/problem';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WhiteService {
  private apiUrl = environment.apiUrl;

  constructor(public http: HttpClient) { }

  async getAllProblems(options?: any): Promise<Problem[]> {
    let x = await lastValueFrom(this.http.get<Problem[]>(
      `${this.apiUrl}/api/ColBlanc/problems`,
      { params: options as any })
    );
    return x;
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

  async acceptFix(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/ColBlanc/${id}/accepter-resolution`, null)
    );
  }

  async refuseFix(id: number, reason: string): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${this.apiUrl}/api/ColBlanc/${id}/refuser-resolution`, { reason: reason })
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
