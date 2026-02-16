import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DuplicateGroupMember } from '../../../models/duplicate-group';

@Component({
  selector: 'app-duplicate-member-card',
  standalone: true,
  imports: [TranslateModule, DatePipe, RouterLink],
  templateUrl: './duplicate-member-card.html',
  styleUrl: './duplicate-member-card.css'
})
export class DuplicateMemberCardComponent {
  readonly member = input.required<DuplicateGroupMember>();
  readonly exclude = output<Event>();

  onExclude(event: Event) {
    event.stopPropagation();
    this.exclude.emit(event);
  }

  getStatusLabel(statut: string): string {
    return statut;
  }

  getCategoryLabel(categorie: string): string {
    return categorie;
  }
}
