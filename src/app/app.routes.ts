import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
