import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  inject, signal, computed, ViewChild, ElementRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChatService } from '../../services/chat-service';
import { MessageService } from '../../services/message-service';
import { ChatHubService, TypingEvent, MessageDeletedEvent, GroupRenamedEvent, MemberAddedEvent, MemberRemovedEvent } from '../../services/chat-hub.service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import {
  ChatDto, ChatType, ChatMemberDto, ChatMemberRole,
  ChatMessageDto, UserSearchResultDto
} from '../../models/chat';
import { RoleOption } from '../../models/user';
import { LoadingSpinnerComponent } from '../../components/ui';

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [FormsModule, TranslateModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './chat-detail.html',
  styleUrl: './chat-detail.css',
})
export class ChatDetail implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private chatHub = inject(ChatHubService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  readonly ChatType = ChatType;
  readonly ChatMemberRole = ChatMemberRole;

  // ── État ──────────────────────────────────────────────────────────────────
  chatId = '';
  chat = signal<ChatDto | null>(null);
  messages = signal<ChatMessageDto[]>([]);
  isLoading = signal(true);
  isLoadingMore = signal(false);
  hasMoreMessages = signal(true);
  private shouldScrollToBottom = true;

  // ── Saisie ────────────────────────────────────────────────────────────────
  newMessage = signal('');
  isSending = signal(false);
  editingMessageId = signal<string | null>(null);
  editingContent = signal('');

  // ── Panneau info / membres ────────────────────────────────────────────────
  showInfoPanel = signal(false);

  // ── Ajout de membre (groupe) ──────────────────────────────────────────────
  memberSearchQuery = signal('');
  memberSearchResults = signal<UserSearchResultDto[]>([]);
  isMemberSearching = signal(false);
  private memberSearchTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Typing ────────────────────────────────────────────────────────────────
  typingUsers = signal<string[]>([]);
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private isTyping = false;

  // ── Rôles ─────────────────────────────────────────────────────────────────
  roles = signal<RoleOption[]>([]);

  // ── Rename ────────────────────────────────────────────────────────────────
  isRenaming = signal(false);
  renameValue = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────
  currentUserId = computed(() => localStorage.getItem('userId') ?? '');

  isGroup = computed(() => this.chat()?.type === ChatType.Group);

  currentMember = computed(() =>
    this.chat()?.members.find(m => m.userId === this.currentUserId())
  );

  isAdmin = computed(() =>
    this.currentMember()?.role === ChatMemberRole.Admin
  );

  chatDisplayName = computed(() => {
    const c = this.chat();
    if (!c) return '';
    if (c.type === ChatType.Group) return c.name ?? '';
    const other = c.members.find(m => m.userId !== this.currentUserId());
    return other?.displayName ?? '';
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    this.chatId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.chatId) {
      this.router.navigate(['/chats']);
      return;
    }

    await Promise.all([this.loadChat(), this.loadMessages(), this.loadRoles()]);

    this.languageService.onLangChange().subscribe(() => this.loadRoles());

    // Rejoindre le chat via SignalR
    await this.chatHub.joinChat(this.chatId);

    // Handlers temps réel
    this.chatHub.onNewMessage = (msg) => {
      if (msg.chatId === this.chatId) {
        this.messages.update(list => [...list, msg]);
        this.shouldScrollToBottom = true;
        // Marquer comme lu
        this.messageService.markAsRead(this.chatId, msg.id).catch(() => {});
      }
    };

    this.chatHub.onMessageEdited = (msg) => {
      if (msg.chatId === this.chatId) {
        this.messages.update(list =>
          list.map(m => m.id === msg.id ? msg : m)
        );
      }
    };

    this.chatHub.onMessageDeleted = (event: MessageDeletedEvent) => {
      if (event.chatId === this.chatId) {
        this.messages.update(list =>
          list.map(m => m.id === event.messageId ? { ...m, isDeleted: true, content: '' } : m)
        );
      }
    };

    this.chatHub.onReactionToggled = (msg) => {
      if (msg.chatId === this.chatId) {
        this.messages.update(list =>
          list.map(m => m.id === msg.id ? msg : m)
        );
      }
    };

    this.chatHub.onTypingStart = (event: TypingEvent) => {
      if (event.chatId === this.chatId && event.userId !== this.currentUserId()) {
        this.typingUsers.update(list =>
          list.includes(event.userId) ? list : [...list, event.userId]
        );
      }
    };

    this.chatHub.onTypingStop = (event: TypingEvent) => {
      if (event.chatId === this.chatId) {
        this.typingUsers.update(list => list.filter(id => id !== event.userId));
      }
    };

    this.chatHub.onMemberAdded = (event: MemberAddedEvent) => {
      if (event.chatId === this.chatId) this.loadChat();
    };

    this.chatHub.onMemberRemoved = (event: MemberRemovedEvent) => {
      if (event.chatId === this.chatId) {
        if (event.userId === this.currentUserId()) {
          this.router.navigate(['/chats']);
        } else {
          this.loadChat();
        }
      }
    };

    this.chatHub.onGroupRenamed = (event: GroupRenamedEvent) => {
      if (event.chatId === this.chatId) {
        this.chat.update(c => c ? { ...c, name: event.newName } : c);
      }
    };

    this.chatHub.onRemovedFromChat = (event) => {
      if (event.chatId === this.chatId) {
        this.router.navigate(['/chats']);
      }
    };
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async ngOnDestroy(): Promise<void> {
    if (this.memberSearchTimer) clearTimeout(this.memberSearchTimer);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.chatId) {
      await this.chatHub.leaveChat(this.chatId);
    }
  }

  // ── Chargement ────────────────────────────────────────────────────────────

  private async loadChat(): Promise<void> {
    try {
      const data = await this.chatService.getChat(this.chatId);
      this.chat.set(data);
    } catch (error) {
      console.error('Error loading chat:', error);
      this.router.navigate(['/chats']);
    }
  }

  private async loadMessages(): Promise<void> {
    try {
      this.isLoading.set(true);
      const msgs = await this.messageService.getMessages(this.chatId);
      // L'API retourne du plus récent au plus ancien → inverser
      this.messages.set(msgs.reverse());
      this.hasMoreMessages.set(msgs.length >= 50);
      this.shouldScrollToBottom = true;

      // Marquer le dernier message comme lu
      if (msgs.length > 0) {
        const lastMsg = this.messages()[this.messages().length - 1];
        await this.messageService.markAsRead(this.chatId, lastMsg.id).catch(() => {});
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadOlderMessages(): Promise<void> {
    const currentMessages = this.messages();
    if (currentMessages.length === 0 || this.isLoadingMore()) return;

    const oldestId = currentMessages[0].id;
    try {
      this.isLoadingMore.set(true);
      const older = await this.messageService.getMessages(this.chatId, oldestId);
      this.hasMoreMessages.set(older.length >= 50);
      this.messages.update(list => [...older.reverse(), ...list]);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      this.isLoadingMore.set(false);
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

  // ── Envoi de message ──────────────────────────────────────────────────────

  async sendMessage(): Promise<void> {
    const content = this.newMessage().trim();
    if (!content || this.isSending()) return;

    try {
      this.isSending.set(true);
      const msg = await this.messageService.sendMessage(this.chatId, { content });
      this.messages.update(list => [...list, msg]);
      this.newMessage.set('');
      this.shouldScrollToBottom = true;
      this.stopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      this.isSending.set(false);
    }
  }

  // ── Édition de message ────────────────────────────────────────────────────

  startEditing(msg: ChatMessageDto): void {
    this.editingMessageId.set(msg.id);
    this.editingContent.set(msg.content);
  }

  cancelEditing(): void {
    this.editingMessageId.set(null);
    this.editingContent.set('');
  }

  async saveEdit(): Promise<void> {
    const msgId = this.editingMessageId();
    const content = this.editingContent().trim();
    if (!msgId || !content) return;

    try {
      const updated = await this.messageService.editMessage(this.chatId, msgId, { content });
      this.messages.update(list => list.map(m => m.id === msgId ? updated : m));
      this.cancelEditing();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }

  // ── Suppression de message ────────────────────────────────────────────────

  async deleteMessage(msg: ChatMessageDto): Promise<void> {
    try {
      await this.messageService.deleteMessage(this.chatId, msg.id);
      this.messages.update(list =>
        list.map(m => m.id === msg.id ? { ...m, isDeleted: true, content: '' } : m)
      );
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  // ── Réactions ─────────────────────────────────────────────────────────────

  async toggleReaction(msg: ChatMessageDto, emoji: string): Promise<void> {
    try {
      const updated = await this.messageService.toggleReaction(this.chatId, msg.id, { emoji });
      this.messages.update(list => list.map(m => m.id === msg.id ? updated : m));
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  }

  // ── Typing ────────────────────────────────────────────────────────────────

  onMessageInput(): void {
    if (!this.isTyping) {
      this.isTyping = true;
      this.chatHub.typingStart(this.chatId);
    }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(), 2000);
  }

  private stopTyping(): void {
    if (this.isTyping) {
      this.isTyping = false;
      this.chatHub.typingStop(this.chatId);
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  getTypingLabel(): string {
    const chat = this.chat();
    const ids = this.typingUsers();
    if (!chat || ids.length === 0) return '';
    const names = ids
      .map(id => chat.members.find(m => m.userId === id)?.displayName?.split(' ')[0])
      .filter(Boolean);
    if (names.length === 1) return this.translate.instant('CHAT_DETAIL.TYPING_ONE', { name: names[0] });
    return this.translate.instant('CHAT_DETAIL.TYPING_MANY');
  }

  // ── Gestion du groupe ─────────────────────────────────────────────────────

  toggleInfoPanel(): void {
    this.showInfoPanel.update(v => !v);
    this.memberSearchQuery.set('');
    this.memberSearchResults.set([]);
  }

  // Rename
  startRenaming(): void {
    this.renameValue.set(this.chat()?.name ?? '');
    this.isRenaming.set(true);
  }

  cancelRenaming(): void {
    this.isRenaming.set(false);
  }

  async saveRename(): Promise<void> {
    const name = this.renameValue().trim();
    if (!name) return;
    try {
      await this.chatService.renameGroup(this.chatId, { name });
      this.chat.update(c => c ? { ...c, name } : c);
      this.isRenaming.set(false);
    } catch (error) {
      console.error('Error renaming group:', error);
    }
  }

  // Add member search
  onMemberSearchInput(query: string): void {
    this.memberSearchQuery.set(query);
    if (this.memberSearchTimer) clearTimeout(this.memberSearchTimer);
    if (!query.trim()) {
      this.memberSearchResults.set([]);
      return;
    }
    this.memberSearchTimer = setTimeout(() => this.searchForNewMember(query), 300);
  }

  private async searchForNewMember(query: string): Promise<void> {
    try {
      this.isMemberSearching.set(true);
      const results = await this.chatService.searchUsers(query);
      const existingIds = new Set(this.chat()?.members.map(m => m.userId) ?? []);
      this.memberSearchResults.set(results.filter(r => !existingIds.has(r.id)));
    } catch (error) {
      console.error('Error searching members:', error);
    } finally {
      this.isMemberSearching.set(false);
    }
  }

  async addMember(user: UserSearchResultDto): Promise<void> {
    try {
      await this.chatService.addMember(this.chatId, { userId: user.id });
      this.memberSearchResults.update(list => list.filter(r => r.id !== user.id));
      await this.loadChat();
    } catch (error) {
      console.error('Error adding member:', error);
    }
  }

  async removeMember(member: ChatMemberDto): Promise<void> {
    try {
      await this.chatService.removeMember(this.chatId, member.userId);
      await this.loadChat();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }

  async leaveChat(): Promise<void> {
    try {
      await this.chatService.leaveChat(this.chatId);
      this.router.navigate(['/chats']);
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  isOwnMessage(msg: ChatMessageDto): boolean {
    return msg.senderId === this.currentUserId();
  }

  showDateSeparator(index: number): boolean {
    const msgs = this.messages();
    if (index === 0) return true;
    const prev = new Date(msgs[index - 1].createdAt).toDateString();
    const curr = new Date(msgs[index].createdAt).toDateString();
    return prev !== curr;
  }

  getDateLabel(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString())
      return this.translate.instant('CHAT_DETAIL.TODAY');
    if (date.toDateString() === yesterday.toDateString())
      return this.translate.instant('CHAT_DETAIL.YESTERDAY');
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  getTimeString(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getRoleLabel(roleKey: string): string {
    const role = this.roles().find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  getMemberDisplayName(userId: string): string {
    const member = this.chat()?.members.find(m => m.userId === userId);
    return member?.displayName ?? '';
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) {}
  }

  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop === 0 && this.hasMoreMessages() && !this.isLoadingMore()) {
      this.loadOlderMessages();
    }
  }

  readonly quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
}
