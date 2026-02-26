import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
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

  /**
   * L'id du chat actuellement ouvert ET VISIBLE (si on est sur /chats/:id).
   * Mis à null dès que NavigationStart quitte la route /chats/:id, pour éviter
   * qu'un événement SignalR reçu pendant la transition soit ignoré à tort.
   */
  private activeChatId: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadUnreadCount();

    // Initialiser avec la route courante
    this.updateActiveChatId(this.router.url);

    // NavigationStart : effacer activeChatId IMMÉDIATEMENT quand on quitte un chat
    // pour éviter que des événements SignalR reçus pendant la navigation soient ignorés
    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
        .subscribe(e => {
          const leavingChatId = this.activeChatId;
          this.updateActiveChatId(e.url);
          // Quand on quitte un chat, recharger le vrai compteur serveur
          if (leavingChatId && !this.activeChatId) {
            this.loadUnreadCount();
          }
        })
    );

    // NavigationEnd : mettre à jour si on vient d'entrer dans un chat
    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          const prevId = this.activeChatId;
          this.updateActiveChatId(e.urlAfterRedirects);
          // Si on entre dans un nouveau chat, recharger pour refléter les lectures
          if (this.activeChatId && this.activeChatId !== prevId) {
            this.loadUnreadCount();
          }
        })
    );

    // Nouveau message → règles :
    // - Si on est dans ce chat → ignorer (chat-detail appelle markAsRead)
    // - Message système hors chat actif → ne JAMAIS incrémenter le badge
    //   (les messages système ne sont pas des "non lus" pour l'utilisateur)
    // - Message normal hors chat actif → incrémenter
    this.subs.push(
      this.chatHubService.newMessage$.subscribe(msg => {
        if (msg.chatId === this.activeChatId) {
          // On est dans ce chat, chat-detail gère markAsRead → rien à faire
          return;
        }
        // Hors chat actif : seulement les vrais messages incrémentent le badge
        if (!msg.isSystemMessage) {
          this.totalUnread.update(c => c + 1);
        }
        // Les messages système ne comptent jamais dans le badge non-lu
      })
    );

    // Accusé de lecture → recharger le compteur réel depuis le serveur
    this.subs.push(
      this.chatHubService.readReceipt$.subscribe(() => this.loadUnreadCount())
    );

    // Ajouté / retiré d'un chat → le total de chats a changé, recharger
    this.subs.push(
      this.chatHubService.addedToChat$.subscribe(() => this.loadUnreadCount()),
      this.chatHubService.removedFromChat$.subscribe(() => this.loadUnreadCount())
    );

    // NOTE: memberAdded/memberRemoved/groupRenamed génèrent des messages système
    // qui ne doivent PAS incrémenter le badge → on ne les écoute pas ici.
    // La liste de chats se rafraîchit via chats.ts qui écoute ces événements.
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
