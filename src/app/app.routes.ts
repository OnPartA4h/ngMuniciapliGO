import { Routes } from '@angular/router';
import { Hello } from './pages/hello/hello';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { ManageReports } from './pages/manage-reports/manage-reports';
import { ManageUsers } from './pages/manage-users/manage-users';
import { CreateUser } from './pages/create-user/create-user';
import { ReportDetails } from './pages/report-details/report-details';
import { authGuard } from './guards/auth-guard';
import { loginGuard } from './guards/login-guard';
import { adminGuard } from './guards/admin-guard';
import { whiteGuard } from './guards/white-guard';

export const routes: Routes = [
  { path: 'hello', component: Hello },
  { path: '', redirectTo: '/home', pathMatch: 'full'},
  { path: 'home', component: Home, canActivate: [authGuard]},
  { path: 'login', component: Login, canActivate: [loginGuard]},
  { path: 'manage-reports', component: ManageReports, canActivate: [authGuard, whiteGuard]},
  { path: 'manage-users', component: ManageUsers, canActivate: [authGuard, adminGuard]},
  { path: 'create-user', component: CreateUser, canActivate: [authGuard, adminGuard]},
  { path: 'report-details/:id', component: ReportDetails, canActivate: [authGuard]}
];
