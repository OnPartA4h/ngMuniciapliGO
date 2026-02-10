import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [],
  templateUrl: './notification-bell.html',
  styleUrls: ['./notification-bell.css']
})
export class NotificationBell implements OnInit {
  constructor(
    public notificationService: NotificationService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Charger le compteur initial depuis l'API
    try {
      const response = await lastValueFrom(this.notificationService.getUnreadCount());
      this.notificationService.setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }
}
