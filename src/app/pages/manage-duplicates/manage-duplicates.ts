import { Component, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { DuplicateGroup } from '../../models/duplicate-group';
import { PageHeaderComponent } from '../../components/ui';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-manage-duplicates',
  imports: [TranslateModule, PageHeaderComponent, RouterLink, DatePipe],
  templateUrl: './manage-duplicates.html',
  styleUrl: './manage-duplicates.css',
})
export class ManageDuplicates implements OnInit {
  whiteService = inject(WhiteService);
  generalService = inject(GeneralService);
  private languageService = inject(LanguageService);

  loading = true;
  errorMessage = '';
  groups: DuplicateGroup[] = [];
  selectedGroup: DuplicateGroup | null = null;

  async ngOnInit() {
    this.loading = true;
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
    this.loading = false;
  }

  async loadGroups() {
    try {
      this.errorMessage = '';
      this.groups = await this.whiteService.getPendingDuplicateGroups();
    } catch (e: any) {
      this.errorMessage = e?.error?.message || 'Error loading duplicate groups';
      this.groups = [];
    }
  }

  async selectGroup(group: DuplicateGroup) {
    if (this.selectedGroup?.id === group.id) {
      this.selectedGroup = null;
      return;
    }
    try {
      this.selectedGroup = await this.whiteService.getDuplicateGroup(group.id);
    } catch {
      this.selectedGroup = group;
    }
  }

  getStatusLabel(statut: number): string {
    return this.generalService.getStatusLabel(statut);
  }

  getCategoryLabel(categorie: number): string {
    return this.generalService.getCategoryLabel(categorie);
  }
}
