import { Component, OnInit, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-manage-duplicates',
  imports: [
    TranslateModule,
    DragDropModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    DuplicateGroupCardComponent,
    DuplicateMemberCardComponent,
    NavigationTabsComponent,
    AiProcessingStatusComponent
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
  readonly movingMemberId = signal<number | null>(null);

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
      this.errorMessage.set(e?.error?.message || 'Error loading duplicate groups');
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
      // Update the group in the list with full data
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
    
    if (!confirm(this.translateService.instant('DUPLICATES.CONFIRM_EXCLUDE'))) {
      return;
    }

    try {
      await this.whiteService.excludeProblemFromGroup(groupId, problemeId);
      
      // Refresh the group
      const groups = this.groups();
      const groupIndex = groups.findIndex(g => g.id === groupId);
      if (groupIndex !== -1) {
        const updatedGroup = await this.whiteService.getDuplicateGroup(groupId);
        groups[groupIndex] = updatedGroup;
        this.groups.set([...groups]);
        
        // If no members left, deselect and reload the groups list
        if (updatedGroup.members.length === 0) {
          this.selectedGroupId.set(null);
          await this.loadGroups(this.currentPage());
        }
      }
    } catch (e: any) {
      this.errorMessage.set(e?.error?.message || 'Error excluding problem');
    }
  }

  async acceptGroup(groupId: number, event: Event) {
    event.stopPropagation();
    
    if (!confirm(this.translateService.instant('DUPLICATES.CONFIRM_ACCEPT'))) {
      return;
    }

    try {
      await this.whiteService.acceptDuplicateGroup(groupId);
      this.selectedGroupId.set(null);
      await this.loadGroups(this.currentPage());
    } catch (e: any) {
      this.errorMessage.set(e?.error?.message || 'Error accepting group');
    }
  }

  async changePage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.loading.set(true);
    await this.loadGroups(page);
    this.loading.set(false);
  }

  async toggleShowClosed() {
    this.showClosed.update(value => !value);
    this.selectedGroupId.set(null);
    this.currentPage.set(1);
    this.loading.set(true);
    await this.loadGroups(1);
    this.loading.set(false);
  }

  /** Retourne les IDs CDK de toutes les listes de membres (pour connecter le drag-drop entre groupes). */
  getDropListIds(): string[] {
    return this.groups().map(g => `members-list-${g.id}`);
  }

  /** Appelé lorsqu'un membre est déposé dans un groupe cible. */
  async dropMember(event: CdkDragDrop<DuplicateGroupMember[]>, targetGroupId: number) {
    if (event.previousContainer === event.container) {
      return;
    }

    const member: DuplicateGroupMember = event.item.data;
    // L'ID CDK de la liste source est "members-list-{groupId}"
    const sourceGroupId = parseInt(event.previousContainer.id.replace('members-list-', ''), 10);

    if (member.isPrimary) {
      this.dragError.set(this.translateService.instant('DUPLICATES.CANNOT_MOVE_PRIMARY'));
      setTimeout(() => this.dragError.set(''), 4000);
      return;
    }

    this.movingMemberId.set(member.id);
    this.dragError.set('');

    // Mise à jour optimiste de l'UI
    const groups = this.groups();
    const sourceIndex = groups.findIndex(g => g.id === sourceGroupId);
    const targetIndex = groups.findIndex(g => g.id === targetGroupId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updatedGroups = groups.map(g => ({ ...g, members: [...g.members] }));
      const memberToMove = updatedGroups[sourceIndex].members.splice(
        updatedGroups[sourceIndex].members.findIndex(m => m.id === member.id), 1
      )[0];
      updatedGroups[targetIndex].members.push(memberToMove);
      this.groups.set(updatedGroups);
    }

    try {
      await this.whiteService.moveMemberToGroup(member.id, targetGroupId);

      // Rafraîchir les deux groupes concernés
      const [updatedSource, updatedTarget] = await Promise.all([
        this.whiteService.getDuplicateGroup(sourceGroupId),
        this.whiteService.getDuplicateGroup(targetGroupId),
      ]);

      const refreshed = this.groups().map(g => {
        if (g.id === sourceGroupId) return updatedSource;
        if (g.id === targetGroupId) return updatedTarget;
        return g;
      });

      // Retirer les groupes sans membres
      this.groups.set(refreshed.filter(g => g.members.length > 0));

      if (updatedSource.members.length === 0 && this.selectedGroupId() === sourceGroupId) {
        this.selectedGroupId.set(null);
      }
    } catch (e: any) {
      this.dragError.set(e?.error?.message || 'DUPLICATES.MOVE_ERROR');
      // Annuler la mise à jour optimiste
      await this.loadGroups(this.currentPage());
    } finally {
      this.movingMemberId.set(null);
    }
  }
}
