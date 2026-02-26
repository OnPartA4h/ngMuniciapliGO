import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChatService } from '../../services/chat-service';
import { ChatHubService } from '../../services/chat-hub.service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { ChatSummaryDto, ChatType, UserSearchResultDto } from '../../models/chat';
import { RoleOption } from '../../models/user';
import { LoadingSpinnerComponent, EmptyStateComponent } from '../../components/ui';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './chats.html',
  styleUrl: './chats.css',
})
export class Chats implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private chatHubService = inject(ChatHubService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private subs: Subscription[] = [];

  // Exposer ChatType pour le template
  readonly ChatType = ChatType;

  // ── État ──────────────────────────────────────────────────────────────────
  chats = signal<ChatSummaryDto[]>([]);
  isLoading = signal(false);
  filter = signal<'all' | 'direct' | 'group'>('all');

  // ── Recherche utilisateurs ────────────────────────────────────────────────
  showNewChatPanel = signal(false);
  searchQuery = signal('');
  searchResults = signal<UserSearchResultDto[]>([]);
  isSearching = signal(false);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Création de groupe ────────────────────────────────────────────────────
  isGroupMode = signal(false);
  selectedUsers = signal<UserSearchResultDto[]>([]);
  groupName = signal('');
  isCreating = signal(false);

  // ── Rôles (traduction) ────────────────────────────────────────────────────
  roles = signal<RoleOption[]>([]);

  // ── Typing indicators per chat ────────────────────────────────────────────
  typingByChatId = signal<Map<string, Set<string>>>(new Map());
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // ── Computed ──────────────────────────────────────────────────────────────
  filteredChats = computed(() => {
    const all = this.chats();
    const f = this.filter();
    if (f === 'direct') return all.filter(c => c.type === ChatType.Direct);
    if (f === 'group') return all.filter(c => c.type === ChatType.Group);
    return all;
  });

  totalUnread = computed(() =>
    this.chats().reduce((sum, c) => sum + c.unreadCount, 0)
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadChats(), this.loadRoles()]);

    // Recharger les rôles quand la langue change
    this.subs.push(
      this.languageService.onLangChange().subscribe(() => this.loadRoles())
    );

    const currentUserId = localStorage.getItem('userId') ?? '';

    // Temps réel via Subjects
    this.subs.push(
      this.chatHubService.newMessage$.subscribe(() => this.loadChats()),
      this.chatHubService.messageEdited$.subscribe(() => this.loadChats()),
      this.chatHubService.messageDeleted$.subscribe(() => this.loadChats()),
      this.chatHubService.addedToChat$.subscribe(() => this.loadChats()),
      this.chatHubService.removedFromChat$.subscribe(() => this.loadChats()),
      this.chatHubService.groupRenamed$.subscribe(() => this.loadChats()),
      this.chatHubService.memberAdded$.subscribe(() => this.loadChats()),
      this.chatHubService.memberRemoved$.subscribe(() => this.loadChats()),
      // readReceipt: only refresh if it's OUR receipt (to update unread counts)
      this.chatHubService.readReceipt$.subscribe(event => {
        if (event.userId === currentUserId) this.loadChats();
      }),
      // Typing indicators
      this.chatHubService.typingStart$.subscribe(event => {
        if (event.userId === currentUserId) return;
        this.typingByChatId.update(map => {
          const m = new Map(map);
          const users = new Set(m.get(event.chatId) ?? []);
          users.add(event.userId);
          m.set(event.chatId, users);
          return m;
        });
        // Auto-clear after 3 seconds if no typingStop received
        const timerKey = `${event.chatId}_${event.userId}`;
        if (this.typingTimers.has(timerKey)) clearTimeout(this.typingTimers.get(timerKey)!);
        this.typingTimers.set(timerKey, setTimeout(() => {
          this.removeTypingUser(event.chatId, event.userId);
          this.typingTimers.delete(timerKey);
        }, 3000));
      }),
      this.chatHubService.typingStop$.subscribe(event => {
        this.removeTypingUser(event.chatId, event.userId);
        const timerKey = `${event.chatId}_${event.userId}`;
        if (this.typingTimers.has(timerKey)) {
          clearTimeout(this.typingTimers.get(timerKey)!);
          this.typingTimers.delete(timerKey);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Typing helpers ────────────────────────────────────────────────────────

  private removeTypingUser(chatId: string, userId: string): void {
    this.typingByChatId.update(map => {
      const m = new Map(map);
      const users = new Set(m.get(chatId) ?? []);
      users.delete(userId);
      if (users.size === 0) {
        m.delete(chatId);
      } else {
        m.set(chatId, users);
      }
      return m;
    });
  }

  isChatTyping(chatId: string): boolean {
    return (this.typingByChatId().get(chatId)?.size ?? 0) > 0;
  }

  // ── Online presence helpers ───────────────────────────────────────────────

  isUserOnline(userId: string | null): boolean {
    if (!userId) return false;
    return this.chatHubService.isUserOnline(userId);
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  async loadChats(): Promise<void> {
    try {
      this.isLoading.set(true);
      const data = await this.chatService.getMyChats();
      this.chats.set(data);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.roles.set(await this.generalService.getRoles(lang));
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  getRoleLabel(roleKey: string): string {
    const role = this.roles().find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  // ── Filtre ────────────────────────────────────────────────────────────────

  setFilter(f: 'all' | 'direct' | 'group'): void {
    this.filter.set(f);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  openChat(chat: ChatSummaryDto): void {
    this.router.navigate(['/chats', chat.id]);
  }

  // ── Panneau nouveau chat ──────────────────────────────────────────────────

  toggleNewChatPanel(): void {
    const opening = !this.showNewChatPanel();
    this.showNewChatPanel.set(opening);
    if (!opening) this.resetNewChatPanel();
  }

  private resetNewChatPanel(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.isGroupMode.set(false);
    this.selectedUsers.set([]);
    this.groupName.set('');
    this.isCreating.set(false);
  }

  toggleGroupMode(): void {
    this.isGroupMode.update(v => !v);
    this.selectedUsers.set([]);
    this.groupName.set('');
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  onSearchInput(query: string): void {
    this.searchQuery.set(query);

    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);

    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    this.searchDebounceTimer = setTimeout(() => this.performSearch(query), 300);
  }

  private async performSearch(query: string): Promise<void> {
    try {
      this.isSearching.set(true);
      const results = await this.chatService.searchUsers(query);
      // Exclure les utilisateurs déjà sélectionnés
      const selectedIds = new Set(this.selectedUsers().map(u => u.id));
      this.searchResults.set(results.filter(r => !selectedIds.has(r.id)));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      this.isSearching.set(false);
    }
  }

  // ── Sélection ─────────────────────────────────────────────────────────────

  async selectUser(user: UserSearchResultDto): Promise<void> {
    if (this.isGroupMode()) {
      // Mode groupe : ajouter à la sélection
      this.selectedUsers.update(list => [...list, user]);
      this.searchResults.update(list => list.filter(r => r.id !== user.id));
    } else {
      // Mode direct : créer ou ouvrir le chat immédiatement
      try {
        this.isCreating.set(true);
        const chat = await this.chatService.getOrCreateDirectChat({ targetUserId: user.id });
        this.resetNewChatPanel();
        this.showNewChatPanel.set(false);
        this.router.navigate(['/chats', chat.id]);
      } catch (error) {
        console.error('Error creating direct chat:', error);
      } finally {
        this.isCreating.set(false);
      }
    }
  }

  removeSelectedUser(user: UserSearchResultDto): void {
    this.selectedUsers.update(list => list.filter(u => u.id !== user.id));
  }

  // ── Création de groupe ────────────────────────────────────────────────────

  async createGroupChat(): Promise<void> {
    const members = this.selectedUsers();
    const name = this.groupName().trim();
    if (members.length < 2 || !name) return;

    try {
      this.isCreating.set(true);
      const chat = await this.chatService.createGroupChat({
        name,
        memberIds: members.map(u => u.id),
      });
      this.resetNewChatPanel();
      this.showNewChatPanel.set(false);
      this.router.navigate(['/chats', chat.id]);
    } catch (error) {
      console.error('Error creating group chat:', error);
    } finally {
      this.isCreating.set(false);
    }
  }

  // ── Helpers de template ───────────────────────────────────────────────────

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getTimeLabel(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return this.translate.instant('CHAT.JUST_NOW');
    if (diffMins < 60) return this.translate.instant('CHAT.MINUTES_AGO', { count: diffMins });
    if (diffHours < 24) return this.translate.instant('CHAT.HOURS_AGO', { count: diffHours });
    if (diffDays < 7) return this.translate.instant('CHAT.DAYS_AGO', { count: diffDays });

    return date.toLocaleDateString();
  }

  truncateMessage(content: string, maxLength: number = 50): string {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '…' : content;
  }
}
