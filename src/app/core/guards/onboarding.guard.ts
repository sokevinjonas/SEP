import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DatabaseService } from '../db/database.service';

export const onboardingGuard: CanActivateFn = async (route, state) => {
  const db = inject(DatabaseService);
  const router = inject(Router);

  const profile = await db.getUserProfile();
  const isOnboardingRoute = state.url.includes('/onboarding');

  if (!profile.hasCompletedOnboarding) {
    if (!isOnboardingRoute) {
      return router.createUrlTree(['/onboarding']);
    }
    return true;
  }

  // If already completed onboarding and trying to access /onboarding, redirect to /home
  if (isOnboardingRoute) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
