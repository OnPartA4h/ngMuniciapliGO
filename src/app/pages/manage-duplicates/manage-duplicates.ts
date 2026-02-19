import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { DuplicateGroup, DuplicateGroupMember } from '../../models/duplicate-group';
import {
  PageHeaderComponent,
  LoadingSpinnerComponent,
  EmptyStateComponent,
  PaginationComponent,
  NavigationTabsComponent,
  NavigationTab,
  AiProcessingStatusComponent
} from '../../components/ui';
import { DuplicateGroupCardComponent } from '../../components/cards/duplicate-group-card/duplicate-group-card';
import { DuplicateMemberCardComponent } from '../../components/cards/duplicate-member-card/duplicate-member-card';
import { ConfirmModalComponent } from '../../components/modals/confirm-modal/confirm-modal';

@Component({
  selector: 'app-manage-duplicates',
  imports: [
    RouterLink,
    TranslateModule,
    DragDropModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    DuplicateGroupCardComponent,
    DuplicateMemberCardComponent,
    NavigationTabsComponent,
    AiProcessingStatusComponent,
    ConfirmModalComponent
  ],
  templateUrl: './manage-duplicates.html',
  styleUrl: './manage-duplicates.css',
})
export class ManageDuplicates implements OnInit {
  private whiteService = inject(WhiteService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly groups = signal<DuplicateGroup[]>([]);
  readonly selectedGroupId = signal<number | null>(null);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalCount = signal(0);
  readonly showClosed = signal(false);
  readonly dragError = signal('');
  readonly isDragging = signal(false);
  readonly dragOverGroupId = signal<number | null>(null);

  // État des modales de confirmation
  readonly showExcludeModal = signal(false);
  readonly showAcceptModal = signal(false);
  readonly confirmModalLoading = signal(false);
  private pendingExcludeGroupId: number | null = null;
  private pendingExcludeProblemeId: number | null = null;
  private pendingAcceptGroupId: number | null = null;

  private errorTimer: ReturnType<typeof setTimeout> | null = null;
  private dragErrorTimer: ReturnType<typeof setTimeout> | null = null;

  private showError(message: string) {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorMessage.set(message);
    this.errorTimer = setTimeout(() => this.errorMessage.set(''), 3000);
  }

  private showDragError(message: string) {
    if (this.dragErrorTimer) clearTimeout(this.dragErrorTimer);
    this.dragError.set(message);
    this.dragErrorTimer = setTimeout(() => this.dragError.set(''), 3000);
  }

  get navigationTabs(): NavigationTab[] {
    return [
      {
        label: 'HEADER.MANAGE_REPORTS',
        route: '/manage-reports',
        icon: 'fas fa-clipboard-list'
      },
      {
        label: 'DUPLICATES.TAB',
        route: '/manage-duplicates',
        icon: 'fas fa-clone',
        badge: this.totalCount()
      }
    ];
  }

  async ngOnInit() {
    this.loading.set(true);
    await Promise.all([
      this.generalService.loadCategories(),
      this.generalService.loadStatuses(),
      this.loadGroups()
    ]);
    this.languageService.onLangChange().subscribe(() => {
      this.generalService.loadCategories();
      this.generalService.loadStatuses();
      this.loadGroups();
    });
    this.loading.set(false);
  }

  async loadGroups(page: number = 1) {
    try {
      this.errorMessage.set('');
      const response = await this.whiteService.getPendingDuplicateGroups(page, this.showClosed());
      this.groups.set(response.items);
      this.currentPage.set(response.pagination.currentPage);
      this.totalPages.set(response.pagination.totalPages);
      this.totalCount.set(response.pagination.totalCount);
    } catch (e: any) {
      this.showError(e?.error?.message || 'Error loading duplicate groups');
      this.groups.set([]);
    }
  }

  async selectGroup(group: DuplicateGroup) {
    if (this.selectedGroupId() === group.id) {
      this.selectedGroupId.set(null);
      return;
    }
    try {
      const fullGroup = await this.whiteService.getDuplicateGroup(group.id);
      this.selectedGroupId.set(fullGroup.id);
      const groups = this.groups();
      const index = groups.findIndex(g => g.id === group.id);
      if (index !== -1) {
        groups[index] = fullGroup;
        this.groups.set([...groups]);
      }
    } catch {
      this.selectedGroupId.set(group.id);
    }
  }

  async excludeProblem(groupId: number, problemeId: number, event: Event) {
    event.stopPropagation();
    this.pendingExcludeGroupId = groupId;
    this.pendingExcludeProblemeId = problemeId;
    this.showExcludeModal.set(true);
  }

  async confirmExclude() {
    const groupId = this.pendingExcludeGroupId;
    const problemeId = this.pendingExcludeProblemeId;
    if (groupId === null || problemeId === null) return;

    this.confirmModalLoading.set(true);
    try {
      await this.whiteService.excludeProblemFromGroup(groupId, problemeId);

      const groups = this.groups();
      const groupIndex = groups.findIndex(g => g.id === groupId);
      if (groupIndex !== -1) {
        const updatedGroup = await this.whiteService.getDuplicateGroup(groupId);
        groups[groupIndex] = updatedGroup;
        this.groups.set([...groups]);

        if (updatedGroup.members.length === 0) {
          this.selectedGroupId.set(null);
          await this.loadGroups(this.currentPage());
        }
      }
    } catch (e: any) {
      this.showError(e?.error?.message || 'Error excluding problem');
    } finally {
      this.confirmModalLoading.set(false);
      this.showExcludeModal.set(false);
      this.pendingExcludeGroupId = null;
      this.pendingExcludeProblemeId = null;
    }
  }

  cancelExclude() {
    this.showExcludeModal.set(false);
    this.pendingExcludeGroupId = null;
    this.pendingExcludeProblemeId = null;
  }

  async acceptGroup(groupId: number, event: Event) {
    event.stopPropagation();
    this.pendingAcceptGroupId = groupId;
    this.showAcceptModal.set(true);
  }

  async confirmAccept() {
    const groupId = this.pendingAcceptGroupId;
    if (groupId === null) return;

    this.confirmModalLoading.set(true);
    try {
      await this.whiteService.acceptDuplicateGroup(groupId);
      this.selectedGroupId.set(null);
      await this.loadGroups(this.currentPage());
    } catch (e: any) {
      this.showError(e?.error?.message || 'Error accepting group');
    } finally {
      this.confirmModalLoading.set(false);
      this.showAcceptModal.set(false);
      this.pendingAcceptGroupId = null;
    }
  }

  cancelAccept() {
    this.showAcceptModal.set(false);
    this.pendingAcceptGroupId = null;
  }

  async changePage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.loading.set(true);
    await this.loadGroups(page);
    this.loading.set(false);
  }

  async toggleShowClosed() {
    this.showClosed.update(v => !v);
    this.selectedGroupId.set(null);
    this.currentPage.set(1);
    this.loading.set(true);
    await this.loadGroups(1);
    this.loading.set(false);
  }

  getDropListIds(): string[] {
    return this.groups().map(g => `group-drop-${g.id}`);
  }

  onDragEnterGroup(groupId: number) {
    this.dragOverGroupId.set(groupId);
    if (this.selectedGroupId() !== groupId) {
      this.selectedGroupId.set(groupId);
    }
  }

  async dropMember(event: CdkDragDrop<DuplicateGroupMember[]>, targetGroupId: number) {
    this.isDragging.set(false);
    this.dragOverGroupId.set(null);

    if (event.previousContainer === event.container) {
      return;
    }

    const member: DuplicateGroupMember = event.item.data;

    if (member.isPrimary) {
      this.showDragError(this.translateService.instant('DUPLICATES.CANNOT_MOVE_PRIMARY'));
      return;
    }

    const sourceGroupId = parseInt(event.previousContainer.id.replace('group-drop-', ''), 10);

    try {
      await this.whiteService.moveMemberToGroup(member.id, targetGroupId);

      const [updatedSource, updatedTarget] = await Promise.all([
        this.whiteService.getDuplicateGroup(sourceGroupId),
        this.whiteService.getDuplicateGroup(targetGroupId),
      ]);

      const refreshed = this.groups().map(g => {
        if (g.id === sourceGroupId) return updatedSource;
        if (g.id === targetGroupId) return updatedTarget;
        return g;
      });

      this.groups.set(refreshed);

      if (updatedSource.members.length === 0 && this.selectedGroupId() === sourceGroupId) {
        this.selectedGroupId.set(null);
      }
    } catch (e: any) {
      this.showDragError(e?.error?.message || this.translateService.instant('DUPLICATES.MOVE_ERROR'));
    }
  }
}

