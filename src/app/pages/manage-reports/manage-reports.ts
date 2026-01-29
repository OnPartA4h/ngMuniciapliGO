import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WhiteService } from '../../services/white-service';
import { Problem } from '../../models/problem';
import { CommonModule } from '@angular/common';
import { StatutProbleme } from '../../enums/statut-probleme';
import { CategorieProbleme } from '../../enums/categorie-probleme';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { ApiService } from '../../services/api-service';

@Component({
  selector: 'app-manage-reports',
  imports: [RouterLink, CommonModule, DaysAgoPipe],
  templateUrl: './manage-reports.html',
  styleUrl: './manage-reports.css',
})
export class ManageReports implements OnInit {
  StatutProbleme = StatutProbleme;
  CategorieProbleme = CategorieProbleme

  public categories: any[] = [];
  public statuts: any[] = [];
  
  problems: Problem[] = []

  constructor(public whiteService: WhiteService, public apiService: ApiService) {}

  async ngOnInit(): Promise<void> {
      this.getAllReports();
      this.categories = await this.apiService.getCategories();
      this.statuts = await this.apiService.getStatuts()
  }
  
  async getAllReports() {
    this.problems = await this.whiteService.getAllProblems()

    this.problems.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return dateA - dateB; 
    });
  }

  getStatutLabel(statut: StatutProbleme) {
    return this.statuts[statut]?.label;
  }

  getCategorieLabel(categorie: CategorieProbleme) {
    return this.categories[categorie]?.label;
  }
}
