import { Component, OnInit, signal, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { Problem, StatusOption, CategoryOption } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { StatutProbleme } from '../../enums/statut-probleme';
import { CategorieProbleme } from '../../enums/categorie-probleme';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';

@Component({
  selector: 'app-manage-reports',
  imports: [RouterLink, CommonModule, DaysAgoPipe],
  templateUrl: './manage-reports.html',
  styleUrl: './manage-reports.css',
})
export class ManageReports implements OnInit {
  StatutProbleme = StatutProbleme;
  CategorieProbleme = CategorieProbleme

  loading = true;

  public categories: CategoryOption[] = [];
  public statuts: StatusOption[] = [];
  
  problems: Problem[] = []

  constructor(
    public whiteService: WhiteService,
    private generalService: GeneralService,
    private languageService: LanguageService
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.loadCategories(),
      this.loadStatuses(),
      this.getAllReports()
    ]);
  }

  async loadCategories() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.categories = await this.generalService.getCategories(lang);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadStatuses() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.statuts = await this.generalService.getStatuses(lang);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }
  
  async getAllReports() {
    this.problems = await this.whiteService.getAllProblems()

    this.problems.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return dateA - dateB; 
    });
  }

  getStatutLabel(statut: StatutProbleme): string {
    const status = this.statuts.find(s => s.key === statut.toString());
    return status ? status.label : statut.toString();
  }

  getCategorieLabel(categorie: CategorieProbleme): string {
    const category = this.categories.find(c => c.key === categorie.toString());
    return category ? category.label : categorie.toString();
  }
}
