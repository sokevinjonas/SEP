import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProfileFacade } from '../../features/profile/facade/profile.facade';

export const onboardingGuard: CanActivateFn = async (route, state) => {
  const profileFacade = inject(ProfileFacade);
  const router = inject(Router);

  const profile = await profileFacade.load();
  const isAuthRoute = state.url.includes('/onboarding') || state.url.includes('/register') || state.url.includes('/login');

  if (!profile.hasCompletedOnboarding) {
    if (!isAuthRoute) {
      return router.createUrlTree(['/onboarding']);
    }
    return true;
  }

  // If already completed onboarding and trying to access /onboarding or /register, redirect to /tabs/home
  if (isAuthRoute) {
    return router.createUrlTree(['/tabs/home']);
  }

  return true;
};
