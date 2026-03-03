import { Component, OnInit, OnDestroy, inject } from '@angular/core';

import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { lastValueFrom, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { NotificationHubService } from '../../services/notification-hub.service';
import { Notification, PaginatedNotifications } from '../../models/notification';
import { PaginationComponent, EmptyStateComponent, LoadingSpinnerComponent, ToastService } from '../../components/ui';
import { CommentService } from '../../services/comment-service';
import { ConfirmModalComponent } from '../../components/modals/confirm-modal/confirm-modal';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [TranslateModule, PaginationComponent, EmptyStateComponent, LoadingSpinnerComponent, ConfirmModalComponent],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class Notifications implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private commentService = inject(CommentService);
  private notificationHubService = inject(NotificationHubService);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private toastService = inject(ToastService);

  notifications: Notification[] = [];
  currentPage = 1;
  totalPages = 1;
  totalCount = 0;
  pageSize = 20;
  loading = false;
  filterRead: boolean | undefined = undefined;
  private newNotificationSubscription?: Subscription;

  // Confirm modal state
  showDeleteConfirm = false;
  pendingDeleteNotification: Notification | null = null;

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
      console.log('API response for notifications:', response);
      this.notifications = response.items;
      this.totalPages = response.pagination.totalPages;
      this.totalCount = response.pagination.totalCount || 0;
      this.pageSize = response.pagination.pageSize;
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
    this.markAsRead(notification);

    if (!this.isReportedComment(notification)){
      this.router.navigate(['/report-details', notification.problemeId]);
    } else {
      this.router.navigate(['/comments/', notification.problemeId])
    }
    
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

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadNotifications();
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

  isReportedComment(notification: Notification): boolean {
    return !!notification.commentReportId;
  }

  getCategoryLabel(category: number): string {
    const categoryKeys: Record<number, string> = {
      0: 'NOTIFICATIONS.CATEGORY_SPAM',
      1: 'NOTIFICATIONS.CATEGORY_INAPPROPRIATE_LANGUAGE',
      2: 'NOTIFICATIONS.CATEGORY_HARASSMENT',
      3: 'NOTIFICATIONS.CATEGORY_HATE_SPEECH',
      4: 'NOTIFICATIONS.CATEGORY_THREATS',
      5: 'NOTIFICATIONS.CATEGORY_MISINFORMATION',
      6: 'NOTIFICATIONS.CATEGORY_OFF_TOPIC',
      7: 'NOTIFICATIONS.CATEGORY_OTHER'
    };
    return categoryKeys[category] ?? 'NOTIFICATIONS.CATEGORY_OTHER';
  }

  async deleteComment(notification: Notification): Promise<void> {
    this.pendingDeleteNotification = notification;
    this.showDeleteConfirm = true;
  }

  async confirmDeleteComment(): Promise<void> {
    const notification = this.pendingDeleteNotification;
    this.showDeleteConfirm = false;
    this.pendingDeleteNotification = null;
    if (!notification) return;

    try {
      await this.commentService.deleteCommentNotif(
        notification.problemeId, 
        notification.commentId, 
        notification.id
      );
      
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
      this.totalCount--;
      
      if (!notification.estLue) {
        this.notificationService.decrementUnreadCount();
      }
      
      this.toastService.success(this.translateService.instant('NOTIFICATIONS.COMMENT_DELETED'));
    } catch (error) {
      console.error('Error deleting comment:', error);
      this.toastService.error(this.translateService.instant('NOTIFICATIONS.ERROR_DELETE'));
    }
  }

  cancelDeleteComment(): void {
    this.showDeleteConfirm = false;
    this.pendingDeleteNotification = null;
  }

  async ignoreReport(notification: Notification): Promise<void> {
    try {
      await this.commentService.ignoreCommentReport(notification.problemeId, notification.id);
      
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
      this.totalCount--;
      
      if (!notification.estLue) {
        this.notificationService.decrementUnreadCount();
      }
      
      this.toastService.success(this.translateService.instant('NOTIFICATIONS.REPORT_IGNORED'));
    } catch (error) {
      console.error('Error ignoring report:', error);
      this.toastService.error(this.translateService.instant('NOTIFICATIONS.ERROR_IGNORE'));
    }
  }
}
