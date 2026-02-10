import { Component, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { EmptyStateComponent } from '../../ui';
import { RoleOption, User } from '../../../models/user';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [TranslateModule, EmptyStateComponent],
  templateUrl: './users-table.html',
})
export class UsersTableComponent {
  readonly users = input.required<User[]>();
  readonly roles = input<RoleOption[]>([]);
  readonly editUser = output<User>();

  getRoleLabel(roleKey: string): string {
    const role = this.roles().find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  onRowClick(user: User): void {
    this.editUser.emit(user);
  }
}
