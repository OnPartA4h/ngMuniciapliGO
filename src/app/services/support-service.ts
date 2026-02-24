import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';
import { Problem } from '../models/problem';
import { HttpClient } from '@angular/common/http';
import { PhoneCall } from '../models/phoneCall';

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  async getProblems(options?: any): Promise<Problem[]> {
    let res = await lastValueFrom(this.http.get<Problem[]>(`${this.apiUrl}/api/Support/GetProblemes`, { params: options as any }));
    console.log(res);
    
    return res;
  }

  async getPhoneCall(): Promise<PhoneCall> {
    let res = await lastValueFrom(this.http.get<PhoneCall>(`${this.apiUrl}/api/Support/GetPhoneCall`))
    console.log(res);
    
    return res
  }
}
