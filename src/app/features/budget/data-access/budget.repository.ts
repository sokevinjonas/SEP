import { Injectable, inject } from '@angular/core';
import { IdbService, currentMonthKey, defaultMonthlyBudget } from '../../../core/db/idb.service';
import { Category, MonthlyBudget } from '../domain/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetRepository {
  private readonly idb = inject(IdbService);

  async getCategories(): Promise<Category[]> {
    const db = await this.idb.db;
    return db.getAll('categories');
  }

  async addCategory(category: Category): Promise<void> {
    const db = await this.idb.db;
    await db.put('categories', category);
  }

  async getMonthlyBudget(monthKey?: string): Promise<MonthlyBudget> {
    const db = await this.idb.db;
    const key = monthKey || currentMonthKey();
    const budget = await db.get('monthly_budgets', key);
    if (budget) return budget;

    const fallback = defaultMonthlyBudget(key);
    await db.put('monthly_budgets', fallback);
    return fallback;
  }

  async saveMonthlyBudget(budget: MonthlyBudget): Promise<void> {
    const db = await this.idb.db;
    await db.put('monthly_budgets', budget);
  }
}
