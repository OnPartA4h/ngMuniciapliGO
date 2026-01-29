import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const whiteGuard: CanActivateFn = (route, state) => {
  let router = inject(Router)
  let roles = inject(AuthService).roles()

   if (!roles.includes("ColBlanc")) {
      console.log("NOT Col Blanc!!!");
      return router.createUrlTree(['/home'])
    }
  
  return true;
};
