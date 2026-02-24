import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';
import { Problem } from '../models/problem';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  async getProblems(options?: any): Promise<Problem[]> {
    let res = await lastValueFrom(this.http.get<Problem[]>(`${this.apiUrl}/api/ColBlanc/problems`, { params: options as any }));
    console.log(res);
    
    return res;
  }
}
