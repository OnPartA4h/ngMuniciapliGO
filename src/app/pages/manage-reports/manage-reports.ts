import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { WhiteService } from '../../services/white-service';
import { Problem } from '../../models/problem';
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

  problems: Problem[] = []

  constructor(public whiteService: WhiteService) {}

  async ngOnInit() {
    await this.getAllReports()
  }

  async getAllReports() {
    this.problems = await this.whiteService.getAllProblems()
    
    this.problems.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return dateA - dateB; 
    });
  }

}
