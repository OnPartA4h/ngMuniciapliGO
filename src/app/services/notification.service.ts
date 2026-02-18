import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { last, lastValueFrom, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification, PaginatedNotifications, UnreadCount } from '../models/notification';
import { Problem } from '../models/problem';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/api/Notification`;
  
  // Signal pour le compteur de notifications non lues
  unreadCount = signal(0);
  
  // Subject pour émettre les nouvelles notifications en temps réel
  private newNotificationSubject = new Subject<Notification>();
  newNotification$ = this.newNotificationSubject.asObservable();

  getNotifications(page: number = 1, estLue?: boolean): Observable<PaginatedNotifications> {
    let params = new HttpParams().set('page', page.toString());
    
    if (estLue !== undefined) {
      params = params.set('estLue', estLue.toString());
    }

    return this.http.get<PaginatedNotifications>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.apiUrl}/unread-count`);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.apiUrl}/read-all`, {});
  }

  // Appelé par le hub SignalR quand une nouvelle notification arrive
  addNotification(notification: Notification): void {
    this.newNotificationSubject.next(notification);
    this.unreadCount.update(count => count + 1);
  }

  // Appelé quand on marque une notification comme lue
  decrementUnreadCount(): void {
    this.unreadCount.update(count => Math.max(0, count - 1));
  }

  // Appeler après markAllAsRead
  resetUnreadCount(): void {
    this.unreadCount.set(0);
  }

  // Setter pour initialiser le compteur depuis l'API
  setUnreadCount(count: number): void {
    this.unreadCount.set(count);
  }

  async subscribe(id: number) {
    let res = await lastValueFrom(this.http.post<any>(`${this.apiUrl}/problems/${id}/subscribe`, null))
    console.log(res);
  }

  async unsubscribe(id: number) {
    let res = await lastValueFrom(this.http.delete<any>(`${this.apiUrl}/problems/${id}/subscribe`))
    console.log(res);
  }

  async isSubscribed(id: number): Promise<boolean> {
    let res = await lastValueFrom(this.http.get<boolean>(`${this.apiUrl}/problems/${id}/isSubscribed`))
    console.log(res);

    return res
  }

  async getSubscribedProblems(options: any): Promise<any> {
    let res = await lastValueFrom(this.http.get<any>(`${this.apiUrl}/my-subscribed-tasks`, {params: options}))
    return res
  }

  
}
