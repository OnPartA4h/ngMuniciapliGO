import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export interface NavigationTab {
  label: string;
  route: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-navigation-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './navigation-tabs.html'
})
export class NavigationTabsComponent {
  readonly tabs = input.required<NavigationTab[]>();
}
