import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Notification, PaginatedNotifications, UnreadCount } from '../models/notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(page: number = 1, estLue?: boolean): Observable<PaginatedNotifications> {
    let params = new HttpParams().set('page', page.toString());
    
    if (estLue !== undefined) {
      params = params.set('estLue', estLue.toString());
    }

    return this.http.get<PaginatedNotifications>(`${this.apiUrl}/notifications`, { params });
  }

  getUnreadCount(): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.apiUrl}/notifications/unread-count`).pipe(
      tap(response => this.unreadCountSubject.next(response.unreadCount))
    );
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        const currentCount = this.unreadCountSubject.value;
        if (currentCount > 0) {
          this.unreadCountSubject.next(currentCount - 1);
        }
      })
    );
  }

  markAllAsRead(): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.apiUrl}/notifications/read-all`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  // Méthode pour mettre à jour le compteur depuis le hub
  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  // Méthode pour incrémenter le compteur quand une nouvelle notification arrive
  incrementUnreadCount(): void {
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }
}
