import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
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
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private notificationHubService: NotificationHubService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();

    // Écouter les nouvelles notifications en temps réel
    this.notificationHubService.notificationReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        if (notification) {
          // Ajouter la nouvelle notification en haut de la liste
          this.notifications.unshift(notification);
          this.totalCount++;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications(this.currentPage, this.filterRead)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedNotifications) => {
          this.notifications = response.items;
          this.totalPages = response.totalPages;
          this.totalCount = response.totalCount;
          this.pageSize = response.pageSize;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.loading = false;
        }
      });
  }

  markAsRead(notification: Notification): void {
    if (notification.estLue) return;

    this.notificationService.markAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedNotification) => {
          // Mettre à jour la notification dans la liste
          const index = this.notifications.findIndex(n => n.id === notification.id);
          if (index !== -1) {
            this.notifications[index] = updatedNotification;
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    if (this.notifications.length === 0) return;

    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Marquer toutes les notifications comme lues localement
          this.notifications = this.notifications.map(n => ({ ...n, estLue: true }));
        },
        error: (error) => {
          console.error('Error marking all as read:', error);
        }
      });
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
