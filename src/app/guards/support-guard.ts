import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const supportGuard: CanActivateFn = (route, state) => {
  let router = inject(Router)
  let roles = inject(AuthService).roles()

   if (!roles.includes("Support")) {
      console.log("NOT SUPPORT!!!");
      return router.createUrlTree([''])
    }
  
  return true;
};
