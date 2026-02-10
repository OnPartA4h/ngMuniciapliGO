import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedProblems } from '../models/paginatedProblems';
import { Problem } from '../models/problem';

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
