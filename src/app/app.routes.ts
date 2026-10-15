import { Routes } from '@angular/router';
import { onboardingGuard } from './core/guards/onboarding.guard';

// Application Routes conforming to Official Ionic Tabs Guide (https://ionicframework.com/docs/api/tabs)
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
    path: 'tabs',
    loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
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
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ]
  },
  {
    path: 'home',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
  {
    path: 'capture',
    redirectTo: 'tabs/capture',
    pathMatch: 'full',
  },
  {
    path: 'budget',
    redirectTo: 'tabs/budget',
    pathMatch: 'full',
  },
  {
    path: 'profile',
    redirectTo: 'tabs/profile',
    pathMatch: 'full',
  },
  {
    path: 'settings',
    redirectTo: 'tabs/profile',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'tabs/home',
  }
];
