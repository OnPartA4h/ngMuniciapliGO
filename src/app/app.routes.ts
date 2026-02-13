import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { loginGuard } from './guards/login-guard';
import { adminGuard } from './guards/admin-guard';
import { whiteGuard } from './guards/white-guard';
import { Hello } from './pages/hello/hello';
import { Map } from './pages/map/map';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { ManageReports } from './pages/manage-reports/manage-reports';
import { ManageUsers } from './pages/manage-users/manage-users';
import { CreateUser } from './pages/create-user/create-user';
import { ReportDetails } from './pages/report-details/report-details';
import { EditProblem } from './pages/edit-problem/edit-problem';
import { Profile } from './pages/profile/profile';
import { Notifications } from './pages/notifications/notifications';
import { Landing } from './pages/landing/landing';
import { ManageDuplicates } from './pages/manage-duplicates/manage-duplicates';

export const routes: Routes = [
  { path: 'hello', component: Hello },
  { path: 'map', component: Map, canActivate: [authGuard]},
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'manage-reports', component: ManageReports, canActivate: [authGuard, whiteGuard] },
  { path: 'manage-duplicates', component: ManageDuplicates, canActivate: [authGuard, whiteGuard] },
  { path: 'manage-users', component: ManageUsers, canActivate: [authGuard, adminGuard] },
  { path: 'create-user', component: CreateUser, canActivate: [authGuard, adminGuard] },
  { path: 'report-details/:id', component: ReportDetails, canActivate: [authGuard] },
  { path: 'edit-problem/:id', component: EditProblem, canActivate: [authGuard, whiteGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'notifications', component: Notifications, canActivate: [authGuard] },
  { path: 'landing', component: Landing },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];
