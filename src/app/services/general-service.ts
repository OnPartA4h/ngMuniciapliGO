import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoleOption } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  async getRoles(lang: string): Promise<RoleOption[]> {
    return await lastValueFrom(
      this.http.get<RoleOption[]>(`${this.apiUrl}/api/General/roles/${lang}`)
    );
  }
}
