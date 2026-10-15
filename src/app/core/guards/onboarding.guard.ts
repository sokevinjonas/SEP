import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DatabaseService } from '../db/database.service';

export const onboardingGuard: CanActivateFn = async (route, state) => {
  const db = inject(DatabaseService);
  const router = inject(Router);

  const profile = await db.getUserProfile();
  const isAuthRoute = state.url.includes('/onboarding') || state.url.includes('/register');

  if (!profile.hasCompletedOnboarding) {
    if (!isAuthRoute) {
      return router.createUrlTree(['/onboarding']);
    }
    return true;
  }

  // If already completed onboarding and trying to access /onboarding or /register, redirect to /home
  if (isAuthRoute) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
