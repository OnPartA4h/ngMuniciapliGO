import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  let router = inject(Router)
  let token = inject(AuthService).token()

  if (!token) {
    return router.createUrlTree(['/login'])
  }

  return true;
};
 