import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { helloWorld } from '../models/helloWorld';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  async helloWorld(): Promise<string> {
    const response = await lastValueFrom(
      this.http.get<helloWorld>(`${this.apiUrl}/api/Hello`)
    );
    console.log(response);

    return response.text;
  }
}
