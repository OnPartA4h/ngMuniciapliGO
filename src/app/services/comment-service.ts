import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Problem } from '../models/problem';
import { UserComment } from '../models/userComment';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  async deleteComment(problemId: number, commentId: number, notificationId: number) {
    let res = await lastValueFrom(this.http.delete<any>(`${this.apiUrl}/api/Probleme/${problemId}/comments/${commentId}/${notificationId}`))
    console.log(res);
    return res;
  }

  async ignoreCommentReport(problemId: number, notificationId: number) {
    let res = await lastValueFrom(this.http.delete<any>(`${this.apiUrl}/api/Probleme/${problemId}/comments/ignore/${notificationId}`, {}))
    console.log(res);
    return res;
  }

  async getComments(problemId: number, page: number = 1): Promise<any> {
    let url = `${this.apiUrl}/api/Probleme/${problemId}/comments?page=${page}`;
    let res = await lastValueFrom(this.http.get<any>(url));
    console.log(res);
    return res;
  }

  
}
