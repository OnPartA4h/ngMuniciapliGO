import { Routes } from '@angular/router';
import { Hello } from './pages/hello/hello';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { ManageReports } from './pages/manage-reports/manage-reports';
import { ManageUsers } from './pages/manage-users/manage-users';
import { ReportDetails } from './pages/report-details/report-details';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'hello', component: Hello },
  { path: '', redirectTo: '/home', pathMatch: 'full'},
  { path: 'home', component: Home, canActivate: [authGuard]},
  { path: 'login', component: Login},
  { path: 'manage-reports', component: ManageReports, canActivate: [authGuard]},
  { path: 'manage-users', component: ManageUsers, canActivate: [authGuard]},
  { path: 'report-details', component: ReportDetails, canActivate: [authGuard]}
];
