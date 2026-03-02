import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { loginGuard } from './guards/login-guard';
import { adminGuard } from './guards/admin-guard';
import { whiteGuard } from './guards/white-guard';
import { supportGuard } from './guards/support-guard';

export const routes: Routes = [
  { path: 'hello', loadComponent: () => import('./pages/hello/hello').then(m => m.Hello) },
  { path: 'map', loadComponent: () => import('./pages/map/map').then(m => m.Map), canActivate: [authGuard, whiteGuard]},
  { path: 'home', loadComponent: () => import('./pages/home/home').then(m => m.Home), canActivate: [authGuard] },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login), canActivate: [loginGuard] },
  { path: 'manage-reports', loadComponent: () => import('./pages/manage-reports/manage-reports').then(m => m.ManageReports), canActivate: [authGuard, whiteGuard] },
  { path: 'manage-duplicates', loadComponent: () => import('./pages/manage-duplicates/manage-duplicates').then(m => m.ManageDuplicates), canActivate: [authGuard, whiteGuard] },
  { path: 'create-duplicate-group', loadComponent: () => import('./pages/create-duplicate-group/create-duplicate-group').then(m => m.CreateDuplicateGroup), canActivate: [authGuard, whiteGuard] },
  { path: 'manage-users', loadComponent: () => import('./pages/manage-users/manage-users').then(m => m.ManageUsers), canActivate: [authGuard, adminGuard] },
  { path: 'create-user', loadComponent: () => import('./pages/create-user/create-user').then(m => m.CreateUser), canActivate: [authGuard, adminGuard] },
  { path: 'report-details/:id', loadComponent: () => import('./pages/report-details/report-details').then(m => m.ReportDetails), canActivate: [authGuard] },
  { path: 'comments/:id', loadComponent: () => import('./pages/comments/comments').then(m => m.Comments), canActivate: [authGuard]},
  { path: 'edit-problem/:id', loadComponent: () => import('./pages/edit-problem/edit-problem').then(m => m.EditProblem), canActivate: [authGuard, whiteGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile), canActivate: [authGuard] },
  { path: 'profile/:id', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile), canActivate: [authGuard, supportGuard] },
  { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications), canActivate: [authGuard] },
  { path: 'chats', loadComponent: () => import('./pages/chats/chats').then(m => m.Chats), canActivate: [authGuard] },
  { path: 'chats/:id', loadComponent: () => import('./pages/chat-detail/chat-detail').then(m => m.ChatDetail), canActivate: [authGuard] },
  { path: 'call', loadComponent: () => import('./pages/video-call/video-call').then(m => m.VideoCall), canActivate: [authGuard] },
  { path: 'help-desk', loadComponent: () => import('./pages/help-desk/help-desk').then(m => m.HelpDesk), canActivate: [authGuard, supportGuard] },
  { path: 'pin-board', loadComponent: () => import('./pages/pin-board/pin-board').then(m => m.PinBoard), canActivate: [authGuard] },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];
