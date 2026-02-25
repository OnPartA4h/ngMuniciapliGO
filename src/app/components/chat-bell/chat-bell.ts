import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ChatService } from '../../services/chat-service';
import { ChatHubService } from '../../services/chat-hub.service';

@Component({
  selector: 'app-chat-bell',
  standalone: true,
  imports: [],
  templateUrl: './chat-bell.html',
  styleUrls: ['./chat-bell.css']
})
export class ChatBell implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private chatHubService = inject(ChatHubService);
  private router = inject(Router);
  private subs: Subscription[] = [];

  totalUnread = signal(0);

  /** L'id du chat actuellement ouvert (si on est sur /chats/:id). */
  private activeChatId: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadUnreadCount();

    // Suivre la route active pour savoir si on est dans un chat
    this.updateActiveChatId(this.router.url);
    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          const oldId = this.activeChatId;
          this.updateActiveChatId(e.urlAfterRedirects);
          // Si on vient d'entrer dans un chat, recharger le compteur
          if (this.activeChatId && this.activeChatId !== oldId) {
            this.loadUnreadCount();
          }
        })
    );

    // Nouveau message → incrémenter seulement si on n'est PAS dans ce chat
    this.subs.push(
      this.chatHubService.newMessage$.subscribe(msg => {
        if (msg.chatId !== this.activeChatId) {
          this.totalUnread.update(c => c + 1);
        }
      })
    );

    // Accusé de lecture → recharger le compteur réel
    this.subs.push(
      this.chatHubService.readReceipt$.subscribe(() => this.loadUnreadCount())
    );

    // Ajouté / retiré d'un chat → recharger
    this.subs.push(
      this.chatHubService.addedToChat$.subscribe(() => this.loadUnreadCount()),
      this.chatHubService.removedFromChat$.subscribe(() => this.loadUnreadCount())
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private updateActiveChatId(url: string): void {
    const match = url.match(/\/chats\/([a-f0-9-]+)/i);
    this.activeChatId = match ? match[1] : null;
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
