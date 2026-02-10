import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedProblems } from '../models/paginatedProblems';
import { Problem } from '../models/problem';

@Injectable({
  providedIn: 'root',
})
export class WhiteService {
  http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  async getAllProblems(options?: any): Promise<Problem[]> {
    let x = await lastValueFrom(this.http.get<Problem[]>(
      `${this.apiUrl}/api/ColBlanc/problems`,
      { params: options as any })
    );
    return x;
  }

  async getMapProblems(radius: number, latitude: number, longitude: number): Promise<Problem[]> {
    let params = new HttpParams().set('radius', radius).set('latitude', latitude).set('longitude', longitude)
    console.log(params);

    let res = await lastValueFrom(this.http.get<Problem[]>(`${this.apiUrl}/api/ColBlanc/map-problems`, {params}))
    console.log(res);
    
    return res
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
