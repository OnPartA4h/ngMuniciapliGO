import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EmptyStateComponent } from '../../ui';
import { RoleOption, User } from '../../../models/user';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, EmptyStateComponent],
  templateUrl: './users-table.html',
})
export class UsersTableComponent {
  @Input({ required: true }) users: User[] = [];
  @Input() roles: RoleOption[] = [];
  @Output() editUser = new EventEmitter<User>();

  getRoleLabel(roleKey: string): string {
    const role = this.roles.find(r => r.key === roleKey);
    return role ? role.label : roleKey;
  }

  onRowClick(user: User): void {
    this.editUser.emit(user);
  }
}
