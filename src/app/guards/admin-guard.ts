import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth-service';

export const adminGuard: CanActivateFn = (route, state) => {
  let router = inject(Router)
  let roles = inject(AuthService).roles()

   if (!roles.includes("Admin")) {
      console.log("NOT ADMIN!!!");
      return router.createUrlTree([''])
    }
  
  return true;
};
