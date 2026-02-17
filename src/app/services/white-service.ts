import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Problem, ProblemeEditDTO } from '../models/problem';
import { DuplicateGroup, PaginatedDuplicateGroup } from '../models/duplicate-group';

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
    console.log(x);
    
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

  async getPendingDuplicateGroups(page: number = 1, isClosed?: boolean): Promise<PaginatedDuplicateGroup> {
    let params = new HttpParams().set('page', page.toString());
    if (isClosed !== undefined) {
      params = params.set('isClosed', isClosed.toString());
    }
    return await lastValueFrom(
      this.http.get<PaginatedDuplicateGroup>(`${this.apiUrl}/api/ColBlanc/duplicate-groups/pending`, { params })
    );
  }

  async getDuplicateGroup(groupId: number): Promise<DuplicateGroup> {
    return await lastValueFrom(
      this.http.get<DuplicateGroup>(`${this.apiUrl}/api/ColBlanc/duplicate-groups/${groupId}`)
    );
  }

  async excludeProblemFromGroup(groupId: number, problemeId: number): Promise<{ message: string }> {
    return await lastValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/api/ColBlanc/duplicate-groups/${groupId}/exclude/${problemeId}`)
    );
  }

  async acceptDuplicateGroup(groupId: number): Promise<DuplicateGroup> {
    return await lastValueFrom(
      this.http.post<DuplicateGroup>(`${this.apiUrl}/api/ColBlanc/duplicate-groups/${groupId}/accept`, null)
    );
  }

  async editProblem(id: number, dto: ProblemeEditDTO): Promise<Problem> {
    return await lastValueFrom(
      this.http.put<Problem>(`${this.apiUrl}/api/ColBlanc/${id}/edit`, dto)
    );
  }
}
