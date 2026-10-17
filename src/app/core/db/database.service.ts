import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Expense, Category, MonthlyBudget, Purchase, SyncItem, UserProfile } from '../models/financial.models';
import { IdbService, currentMonthKey } from './idb.service';
import { ExpensesFacade } from '../../features/expenses/facade/expenses.facade';
import { PurchasesFacade } from '../../features/purchases/facade/purchases.facade';
import { BudgetFacade } from '../../features/budget/facade/budget.facade';
import { ProfileFacade } from '../../features/profile/facade/profile.facade';
import { ExpensesRepository } from '../../features/expenses/data-access/expenses.repository';
import { PurchasesRepository } from '../../features/purchases/data-access/purchases.repository';
import { BudgetRepository } from '../../features/budget/data-access/budget.repository';
import { ProfileRepository } from '../../features/profile/data-access/profile.repository';
import { SyncQueueRepository } from './sync-queue.repository';

export { SepDbSchema } from './idb.service';

/**
 * Compatibility bridge during migration: delegates directly to the new
 * domain repositories and facades while keeping existing call signatures working.
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly idb = inject(IdbService);
  private readonly expensesFacade = inject(ExpensesFacade);
  private readonly purchasesFacade = inject(PurchasesFacade);
  private readonly budgetFacade = inject(BudgetFacade);
  private readonly profileFacade = inject(ProfileFacade);

  private readonly expensesRepo = inject(ExpensesRepository);
  private readonly purchasesRepo = inject(PurchasesRepository);
  private readonly budgetRepo = inject(BudgetRepository);
  private readonly profileRepo = inject(ProfileRepository);
  private readonly syncQueueRepo = inject(SyncQueueRepository);

  public readonly dataChanged$ = new Subject<void>();

  getCurrentMonthKey(): string {
    return currentMonthKey();
  }

  // Expense Methods
  async getExpenses(): Promise<Expense[]> {
    return this.expensesFacade.load();
  }

  async checkDuplicateReference(ref: string): Promise<Expense | undefined> {
    return this.expensesFacade.checkDuplicateReference(ref);
  }

  async addExpense(expense: Expense): Promise<void> {
    await this.expensesFacade.addExpense(expense);
    this.dataChanged$.next();
  }

  async deleteExpense(id: string): Promise<void> {
    await this.expensesFacade.deleteExpense(id);
    this.dataChanged$.next();
  }

  // Category Methods
  async getCategories(): Promise<Category[]> {
    await this.budgetFacade.load();
    return this.budgetFacade.categories();
  }

  async addCategory(category: Category): Promise<void> {
    await this.budgetFacade.addCategory(category);
    this.dataChanged$.next();
  }

  // Budget Methods
  async getMonthlyBudget(monthKey?: string): Promise<MonthlyBudget> {
    if (!monthKey || monthKey === currentMonthKey()) {
      await this.budgetFacade.load();
      const current = this.budgetFacade.monthlyBudget();
      if (current) return current;
    }
    return this.budgetRepo.getMonthlyBudget(monthKey);
  }

  async saveMonthlyBudget(budget: MonthlyBudget): Promise<void> {
    await this.budgetFacade.saveMonthlyBudget(budget);
    this.dataChanged$.next();
  }

  // Purchase Methods
  async getPurchases(statusFilter?: 'pending' | 'bought' | 'abandoned'): Promise<Purchase[]> {
    const list = await this.purchasesFacade.load();
    if (statusFilter) {
      return list.filter(p => p.status === statusFilter);
    }
    return list;
  }

  async addPurchase(purchase: Purchase): Promise<void> {
    await this.purchasesFacade.addPurchase(purchase);
    this.dataChanged$.next();
  }

  async updatePurchase(purchase: Purchase): Promise<void> {
    await this.purchasesFacade.updatePurchase(purchase);
    this.dataChanged$.next();
  }

  async getAvoidedTotal(): Promise<number> {
    await this.purchasesFacade.load();
    return this.purchasesFacade.avoidedTotal();
  }

  // Sync Queue Methods
  async getSyncQueue(): Promise<SyncItem[]> {
    return this.syncQueueRepo.getAll();
  }

  async updateSyncItem(item: SyncItem): Promise<void> {
    await this.syncQueueRepo.update(item);
  }

  // User Profile Methods
  async getUserProfile(): Promise<UserProfile | null> {
    return this.profileFacade.load();
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    await this.profileFacade.saveUserProfile(profile);
    this.dataChanged$.next();
  }

  async clearAllData(): Promise<void> {
    await this.idb.resetAll();
    await Promise.all([
      this.expensesFacade.load(),
      this.purchasesFacade.load(),
      this.budgetFacade.load(),
      this.profileFacade.load()
    ]);
    this.dataChanged$.next();
  }
}
