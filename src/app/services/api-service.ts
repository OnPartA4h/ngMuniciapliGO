import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { helloWorld } from '../models/helloWorld';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(public http: HttpClient) {}

  async helloWorld(): Promise<string> {
    const response = await lastValueFrom(
      this.http.get<helloWorld>(`${this.apiUrl}/api/Hello`)
    );
    console.log(response);

    return response.text;
  }
}
