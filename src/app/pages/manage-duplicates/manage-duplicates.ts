import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { DuplicateGroup } from '../../models/duplicate-group';
import {
  PageHeaderComponent,
  LoadingSpinnerComponent,
  EmptyStateComponent,
  PaginationComponent
} from '../../components/ui';
import { RouterLink } from '@angular/router';
import { DuplicateGroupCardComponent } from '../../components/cards/duplicate-group-card/duplicate-group-card';
import { DuplicateMemberCardComponent } from '../../components/cards/duplicate-member-card/duplicate-member-card';

@Component({
  selector: 'app-manage-duplicates',
  imports: [
    TranslateModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    PaginationComponent,
    DuplicateGroupCardComponent,
    DuplicateMemberCardComponent,
    RouterLink
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
      const response = await this.whiteService.getPendingDuplicateGroups(page, false);
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
}
