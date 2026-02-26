import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  inject, signal, computed, ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LowerCasePipe } from '@angular/common';
import { ChatService } from '../../services/chat-service';
import { MessageService } from '../../services/message-service';
import { VideoCallService } from '../../services/video-call.service';
import { ChatHubService } from '../../services/chat-hub.service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import {
  ChatDto, ChatType, ChatMemberDto, ChatMemberRole,
  ChatMessageDto, UserSearchResultDto, ReplyToDto
} from '../../models/chat';
import { RoleOption } from '../../models/user';
import { LoadingSpinnerComponent } from '../../components/ui';

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [FormsModule, TranslateModule, RouterLink, LoadingSpinnerComponent, LowerCasePipe],
  templateUrl: './chat-detail.html',
  styleUrl: './chat-detail.css',
})
export class ChatDetail implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private videoCallService = inject(VideoCallService);
  readonly chatHub = inject(ChatHubService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private subs: Subscription[] = [];

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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

  // ── Reply-to ──────────────────────────────────────────────────────────────
  replyingTo = signal<ChatMessageDto | null>(null);

  // ── Pièces jointes ────────────────────────────────────────────────────────
  selectedFile = signal<File | null>(null);
  filePreviewUrl = signal<string | null>(null);
  isUploading = signal(false);

  // ── Message vocal ─────────────────────────────────────────────────────────
  isRecording = signal(false);
  recordingDuration = signal(0);
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  // ── Recherche dans le chat ────────────────────────────────────────────────
  showSearch = signal(false);
  searchQuery = signal('');
  searchResults = signal<ChatMessageDto[]>([]);
  isSearching = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  highlightedMessageId = signal<string | null>(null);

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
  private isTypingFlag = false;

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

  otherMember = computed(() => {
    const c = this.chat();
    if (!c || c.type !== ChatType.Direct) return null;
    return c.members.find(m => m.userId !== this.currentUserId()) ?? null;
  });

  /** Is the other user in a direct chat online? */
  isOtherOnline = computed(() => {
    const other = this.otherMember();
    if (!other) return false;
    return this.chatHub.isUserOnline(other.userId);
  });

  // ── Error toast ───────────────────────────────────────────────────────
  recordingError = signal<string | null>(null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    this.chatId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.chatId) {
      this.router.navigate(['/chats']);
      return;
    }

    await Promise.all([this.loadChat(), this.loadMessages(), this.loadRoles()]);

    this.subs.push(
      this.languageService.onLangChange().subscribe(() => this.loadRoles())
    );

    // Rejoindre le chat via SignalR
    await this.chatHub.joinChat(this.chatId);

    // Handlers temps réel via Subjects
    this.subs.push(
      this.chatHub.newMessage$.subscribe(msg => {
        if (msg.chatId === this.chatId) {
          // Éviter les doublons (le message envoyé par soi-même est aussi reçu via SignalR)
          const exists = this.messages().some(m => m.id === msg.id);
          if (!exists) {
            this.messages.update(list => [...list, msg]);
          }
          this.shouldScrollToBottom = true;
          this.messageService.markAsRead(this.chatId, msg.id).catch(() => {});
        }
      }),

      this.chatHub.messageEdited$.subscribe(msg => {
        if (msg.chatId === this.chatId) {
          this.messages.update(list => list.map(m => m.id === msg.id ? msg : m));
        }
      }),

      this.chatHub.messageDeleted$.subscribe(event => {
        if (event.chatId === this.chatId) {
          this.messages.update(list =>
            list.map(m => m.id === event.messageId ? { ...m, isDeleted: true, content: '' } : m)
          );
        }
      }),

      this.chatHub.reactionToggled$.subscribe(msg => {
        if (msg.chatId === this.chatId) {
          this.messages.update(list => list.map(m => m.id === msg.id ? msg : m));
        }
      }),

      this.chatHub.typingStart$.subscribe(event => {
        if (event.chatId === this.chatId && event.userId !== this.currentUserId()) {
          this.typingUsers.update(list =>
            list.includes(event.userId) ? list : [...list, event.userId]
          );
          // Scroll to bottom so the typing indicator is visible
          this.shouldScrollToBottom = true;
        }
      }),

      this.chatHub.typingStop$.subscribe(event => {
        if (event.chatId === this.chatId) {
          this.typingUsers.update(list => list.filter(id => id !== event.userId));
        }
      }),

      this.chatHub.memberAdded$.subscribe(event => {
        if (event.chatId === this.chatId) {
          // Recharger les membres ET les messages (le serveur génère un message système)
          this.loadChat();
          this.reloadLatestMessages();
        }
      }),

      this.chatHub.memberRemoved$.subscribe(event => {
        if (event.chatId === this.chatId) {
          if (event.userId === this.currentUserId()) {
            this.router.navigate(['/chats']);
          } else {
            // Recharger les membres ET les messages (le serveur génère un message système)
            this.loadChat();
            this.reloadLatestMessages();
          }
        }
      }),

      this.chatHub.groupRenamed$.subscribe(event => {
        if (event.chatId === this.chatId) {
          this.chat.update(c => c ? { ...c, name: event.newName } : c);
          // Le renommage génère aussi un message système
          this.reloadLatestMessages();
        }
      }),

      this.chatHub.removedFromChat$.subscribe(event => {
        if (event.chatId === this.chatId) {
          this.router.navigate(['/chats']);
        }
      }),
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.shouldScrollToBottom = false;
      // Use setTimeout(0) to ensure the browser has painted the DOM before scrolling
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  async ngOnDestroy(): Promise<void> {
    this.subs.forEach(s => s.unsubscribe());
    if (this.memberSearchTimer) clearTimeout(this.memberSearchTimer);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.recordingInterval) clearInterval(this.recordingInterval);
    this.stopRecording(true);
    this.clearFileSelection();
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
      // Force multiple scroll attempts after the view has fully re-rendered with messages visible.
      // Some browsers/frameworks need extra frames before scrollHeight is accurate.
      setTimeout(() => this.scrollToBottom(), 50);
      setTimeout(() => this.scrollToBottom(), 200);
      setTimeout(() => this.scrollToBottom(), 500);
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

  /**
   * Recharge les messages les plus récents et fusionne les nouveaux sans
   * perdre ceux déjà affichés. Utilisé quand un événement SignalR de groupe
   * (membre ajouté/retiré, renommage) génère un message système côté serveur
   * qui n'arriverait pas forcément via newMessage$.
   */
  private async reloadLatestMessages(): Promise<void> {
    try {
      const fresh = await this.messageService.getMessages(this.chatId);
      const freshReversed = fresh.reverse();
      const existingIds = new Set(this.messages().map(m => m.id));
      const newOnes = freshReversed.filter(m => !existingIds.has(m.id));
      if (newOnes.length > 0) {
        this.messages.update(list => [...list, ...newOnes]);
        this.shouldScrollToBottom = true;
        const last = newOnes[newOnes.length - 1];
        this.messageService.markAsRead(this.chatId, last.id).catch(() => {});
      }
    } catch (error) {
      console.error('Error reloading latest messages:', error);
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
    const file = this.selectedFile();

    // Si un fichier est sélectionné, on l'envoie via upload
    if (file) {
      await this.sendFileMessage();
      return;
    }

    const content = this.newMessage().trim();
    if (!content || this.isSending()) return;

    try {
      this.isSending.set(true);
      this.newMessage.set('');
      this.stopTyping();

      const replyTo = this.replyingTo();
      await this.messageService.sendMessage(this.chatId, {
        content,
        replyToMessageId: replyTo?.id,
      });
      this.replyingTo.set(null);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.newMessage.set(this.newMessage() || content);
    } finally {
      this.isSending.set(false);
    }
  }

  // ── Pièces jointes / Upload ───────────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile.set(file);

    // Générer un aperçu pour les images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => this.filePreviewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      this.filePreviewUrl.set(null);
    }
  }

  clearFileSelection(): void {
    this.selectedFile.set(null);
    this.filePreviewUrl.set(null);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private async sendFileMessage(): Promise<void> {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;

    try {
      this.isUploading.set(true);
      this.isSending.set(true);
      const caption = this.newMessage().trim() || undefined;
      await this.messageService.sendFileMessage(this.chatId, file, caption);
      this.clearFileSelection();
      this.newMessage.set('');
      this.replyingTo.set(null);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending file message:', error);
    } finally {
      this.isUploading.set(false);
      this.isSending.set(false);
    }
  }

  // ── Reply-to ──────────────────────────────────────────────────────────────

  startReply(msg: ChatMessageDto): void {
    this.replyingTo.set(msg);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  getReplyPreviewContent(msg: ChatMessageDto): string {
    if (msg.isVoiceMessage) return this.translate.instant('CHAT_DETAIL.VOICE_MESSAGE');
    if (msg.attachmentUrl) return this.translate.instant('CHAT_DETAIL.ATTACHMENT');
    return msg.content?.length > 80 ? msg.content.substring(0, 80) + '…' : msg.content;
  }

  // ── Message vocal ─────────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    // Clear previous error
    this.recordingError.set(null);

    // First check if mediaDevices API is available (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.recordingError.set(this.translate.instant('CHAT_DETAIL.RECORDING_ERROR'));
      this.autoHideRecordingError();
      return;
    }

    try {
      // Check for available audio input devices before requesting the stream
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      if (audioInputs.length === 0) {
        this.recordingError.set(this.translate.instant('CHAT_DETAIL.RECORDING_NO_DEVICE'));
        this.autoHideRecordingError();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best supported mimeType
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(mt => MediaRecorder.isTypeSupported(mt)) ?? '';

      this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start(100);
      this.isRecording.set(true);
      this.recordingDuration.set(0);

      this.recordingInterval = setInterval(() => {
        this.recordingDuration.update(d => d + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error starting recording:', error);

      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.recordingError.set(this.translate.instant('CHAT_DETAIL.RECORDING_NO_DEVICE'));
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.recordingError.set(this.translate.instant('CHAT_DETAIL.RECORDING_PERMISSION_DENIED'));
      } else {
        this.recordingError.set(this.translate.instant('CHAT_DETAIL.RECORDING_ERROR'));
      }
      this.autoHideRecordingError();
    }
  }

  private autoHideRecordingError(): void {
    setTimeout(() => this.recordingError.set(null), 6000);
  }

  async stopRecording(discard = false): Promise<void> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    return new Promise<void>((resolve) => {
      if (!this.mediaRecorder) { resolve(); return; }

      this.mediaRecorder.onstop = async () => {
        this.mediaRecorder!.stream.getTracks().forEach(t => t.stop());
        this.isRecording.set(false);

        if (!discard && this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          try {
            this.isSending.set(true);
            await this.messageService.sendFileMessage(this.chatId, file);
            this.shouldScrollToBottom = true;
          } catch (error) {
            console.error('Error sending voice message:', error);
          } finally {
            this.isSending.set(false);
          }
        }

        this.recordedChunks = [];
        this.recordingDuration.set(0);
        resolve();
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    this.stopRecording(true);
  }

  formatRecordingDuration(): string {
    const d = this.recordingDuration();
    const min = Math.floor(d / 60);
    const sec = d % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Recherche dans le chat ────────────────────────────────────────────────

  toggleSearch(): void {
    this.showSearch.update(v => !v);
    if (!this.showSearch()) {
      this.searchQuery.set('');
      this.searchResults.set([]);
      this.highlightedMessageId.set(null);
    }
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (!query.trim()) {
      this.searchResults.set([]);
      this.highlightedMessageId.set(null);
      return;
    }
    this.searchTimer = setTimeout(() => this.performSearch(query), 400);
  }

  private async performSearch(query: string): Promise<void> {
    try {
      this.isSearching.set(true);
      const results = await this.messageService.searchMessages(this.chatId, query);
      this.searchResults.set(results);
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      this.isSearching.set(false);
    }
  }

  scrollToMessage(msgId: string): void {
    this.highlightedMessageId.set(msgId);
    const el = document.getElementById('msg-' + msgId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Remove highlight after 2 seconds
      setTimeout(() => this.highlightedMessageId.set(null), 2500);
    }
  }

  // ── Appels audio/vidéo ────────────────────────────────────────────────────

  startCall(isVideo: boolean): void {
    const params = new URLSearchParams({
      chatId: this.chatId,
      isVideo: String(isVideo),
    });
    window.open(
      `/call?${params.toString()}`,
      '_blank',
      'width=900,height=700,menubar=no,toolbar=no'
    );
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
    const confirmed = confirm(this.translate.instant('CHAT_DETAIL.DELETE_CONFIRM'));
    if (!confirmed) return;

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
    if (!this.isTypingFlag) {
      this.isTypingFlag = true;
      this.chatHub.typingStart(this.chatId);
    }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(), 2000);
  }

  private stopTyping(): void {
    if (this.isTypingFlag) {
      this.isTypingFlag = false;
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
    const confirmed = confirm(
      this.translate.instant('CHAT_DETAIL.REMOVE_CONFIRM', { name: member.displayName })
    );
    if (!confirmed) return;

    try {
      await this.chatService.removeMember(this.chatId, member.userId);
      await this.loadChat();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }

  async leaveChat(): Promise<void> {
    const confirmed = confirm(this.translate.instant('CHAT_DETAIL.LEAVE_CONFIRM'));
    if (!confirmed) return;

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

  getVoiceDurationLabel(seconds: number | null): string {
    if (!seconds) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  getAttachmentIcon(type: string | null): string {
    if (!type) return 'fas fa-file';
    if (type.startsWith('image/')) return 'fas fa-image';
    if (type.startsWith('audio/')) return 'fas fa-microphone';
    if (type.startsWith('video/')) return 'fas fa-video';
    if (type.includes('pdf')) return 'fas fa-file-pdf';
    if (type.includes('word') || type.includes('document')) return 'fas fa-file-word';
    if (type.includes('sheet') || type.includes('excel')) return 'fas fa-file-excel';
    return 'fas fa-file';
  }

  getFileName(url: string | null): string {
    if (!url) return '';
    return url.split('/').pop()?.split('?')[0] ?? 'file';
  }

  getRoleLabel(roleKey: string): string {
    const role = this.roles().find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  getMemberDisplayName(userId: string): string {
    const member = this.chat()?.members.find(m => m.userId === userId);
    return member?.displayName ?? '';
  }

  isMemberOnline(userId: string): boolean {
    return this.chatHub.isUserOnline(userId);
  }

  /** Count of online members (excluding self) for group chats. */
  onlineMemberCount(): number {
    const c = this.chat();
    if (!c) return 0;
    return c.members.filter(
      m => m.userId !== this.currentUserId() && this.chatHub.isUserOnline(m.userId)
    ).length;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        // Disable smooth scrolling temporarily for instant jump
        el.style.scrollBehavior = 'auto';
        el.scrollTop = el.scrollHeight;
        // Re-enable smooth scrolling after the jump
        requestAnimationFrame(() => {
          el.style.scrollBehavior = '';
        });
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
