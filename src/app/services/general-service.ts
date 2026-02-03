import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoleOption } from '../models/user';
import { StatusOption, CategoryOption, AssigneAOption } from '../models/problem';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  async getRoles(lang: string): Promise<RoleOption[]> {
    return await lastValueFrom(
      this.http.get<RoleOption[]>(`${this.apiUrl}/api/General/roles/${lang}`)
    );
  }

  async getStatuses(lang: string): Promise<StatusOption[]> {
    return await lastValueFrom(
      this.http.get<StatusOption[]>(`${this.apiUrl}/api/General/statuts/${lang}`)
    );
  }

  async getCategories(lang: string): Promise<CategoryOption[]> {
    return await lastValueFrom(
      this.http.get<CategoryOption[]>(`${this.apiUrl}/api/General/categories/${lang}`)
    );
  }

  async getAssigneA(lang: string): Promise<AssigneAOption[]> {
    return await lastValueFrom(
      this.http.get<CategoryOption[]>(`${this.apiUrl}/api/General/assignees/${lang}`)
    );
  }

  async getProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(`${this.apiUrl}/api/General/problem/${id}`)
    );
  }
}
