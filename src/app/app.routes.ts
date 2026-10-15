import { Routes } from '@angular/router';
import { onboardingGuard } from './core/guards/onboarding.guard';

// Application Routes with Onboarding & Register Guards
export const routes: Routes = [
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
    canActivate: [onboardingGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register.page').then((m) => m.RegisterPage),
    canActivate: [onboardingGuard]
  },
  {
    path: '',
    canActivate: [onboardingGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'capture',
        loadComponent: () => import('./features/capture/capture.page').then((m) => m.CapturePage),
      },
      {
        path: 'budget',
        loadComponent: () => import('./features/budget/budget.page').then((m) => m.BudgetPage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ]
  },
  {
    path: '**',
    redirectTo: 'home',
  }
];
