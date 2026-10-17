import { Injectable, inject } from '@angular/core';
import { IdbService, currentMonthKey } from '../../../core/db/idb.service';
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

  async getMonthlyBudget(monthKey?: string): Promise<MonthlyBudget | null> {
    const db = await this.idb.db;
    const key = monthKey || currentMonthKey();
    const budget = await db.get('monthly_budgets', key);
    return budget || null;
  }

  async saveMonthlyBudget(budget: MonthlyBudget): Promise<void> {
    const db = await this.idb.db;
    await db.put('monthly_budgets', budget);
  }
}
