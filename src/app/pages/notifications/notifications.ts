import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { NotificationHubService } from '../../services/notification-hub.service';
import { Notification, PaginatedNotifications } from '../../models/notification';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class Notifications implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;
  pageSize = 20;
  loading = false;
  filterRead: boolean | undefined = undefined;
  private newNotificationSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private notificationHubService: NotificationHubService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    
    // S'abonner aux nouvelles notifications en temps réel
    this.newNotificationSubscription = this.notificationService.newNotification$.subscribe(
      (notification: Notification) => {
        this.notifications.unshift(notification);
        this.totalCount++;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.newNotificationSubscription) {
      this.newNotificationSubscription.unsubscribe();
    }
  }

  async loadNotifications(): Promise<void> {
    this.loading = true;
    try {
      const response = await lastValueFrom(
        this.notificationService.getNotifications(this.currentPage, this.filterRead)
      );
      this.notifications = response.items;
      this.totalPages = response.totalPages;
      this.totalCount = response.totalCount;
      this.pageSize = response.pageSize;
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      this.loading = false;
    }
  }

  async markAsRead(notification: Notification): Promise<void> {
    if (notification.estLue) return;

    try {
      const updatedNotification = await lastValueFrom(
        this.notificationService.markAsRead(notification.id)
      );
      const index = this.notifications.findIndex(n => n.id === notification.id);
      if (index !== -1) {
        this.notifications[index] = updatedNotification;
      }
      this.notificationService.decrementUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    if (this.notifications.length === 0) return;

    try {
      await lastValueFrom(this.notificationService.markAllAsRead());
      this.notifications = this.notifications.map(n => ({ ...n, estLue: true }));
      this.notificationService.resetUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  goToReport(notification: Notification): void {
    // Marquer comme lue avant de naviguer
    this.markAsRead(notification);
    this.router.navigate(['/report-details', notification.problemeId]);
  }

  setFilter(filter: boolean | undefined): void {
    this.filterRead = filter;
    this.currentPage = 1;
    this.loadNotifications();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNotifications();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadNotifications();
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  }

  areAllNotificationsRead(): boolean {
    return this.notifications.length > 0 && this.notifications.every(n => n.estLue);
  }
}
