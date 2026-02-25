import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = authService.token();

  if (!token) {
    // Si un userId est en localStorage, c'est que la session a expiré (token supprimé/expiré)
    const hadSession = !!localStorage.getItem('userId');
    if (hadSession) {
      localStorage.removeItem('userId');
      localStorage.removeItem('roles');
      return router.createUrlTree(['/login'], { queryParams: { sessionExpired: 'true' } });
    }
    return router.createUrlTree(['/login']);
  }

  return true;
};
 