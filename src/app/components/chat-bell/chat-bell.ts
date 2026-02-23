import { Component, OnInit, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../../services/chat-service';
import { ChatHubService } from '../../services/chat-hub.service';
import { signal } from '@angular/core';

@Component({
  selector: 'app-chat-bell',
  standalone: true,
  imports: [],
  templateUrl: './chat-bell.html',
  styleUrls: ['./chat-bell.css']
})
export class ChatBell implements OnInit {
  private chatService = inject(ChatService);
  private chatHubService = inject(ChatHubService);
  private router = inject(Router);

  totalUnread = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadUnreadCount();

    // Mettre à jour le compteur quand un nouveau message arrive
    this.chatHubService.onNewMessage = () => {
      this.totalUnread.update(c => c + 1);
    };
  }

  private async loadUnreadCount(): Promise<void> {
    try {
      const chats = await this.chatService.getMyChats();
      const total = chats.reduce((sum, c) => sum + c.unreadCount, 0);
      this.totalUnread.set(total);
    } catch (error) {
      console.error('Error loading chat unread count:', error);
    }
  }

  goToChats(): void {
    this.router.navigate(['/chats']);
  }
}
