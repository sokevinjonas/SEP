import { Injectable, inject, computed } from '@angular/core';
import { BudgetState } from '../state/budget.state';
import { BudgetRepository } from '../data-access/budget.repository';
import { ExpensesFacade } from '../../expenses/facade/expenses.facade';
import { BudgetCalculatorService, BudgetConsumption, BudgetDaysCalculation } from '../../../core/services/budget-calculator.service';
import { Category, MonthlyBudget, CategoryEnvelopeView } from '../domain/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetFacade {
  private readonly state = inject(BudgetState);
  private readonly repo = inject(BudgetRepository);
  private readonly expensesFacade = inject(ExpensesFacade);
  private readonly calculator = inject(BudgetCalculatorService);

  readonly categories = this.state.categories;
  readonly monthlyBudget = this.state.monthlyBudget;
  readonly totalBudgetAllocatedGhs = this.state.totalBudgetAllocatedGhs;
  readonly totalBudgetCeilingGhs = this.state.totalBudgetCeilingGhs;
  readonly plannedDailyBudgetGhs = this.state.plannedDailyBudgetGhs;
  readonly isDiscoveryMode = this.state.isDiscoveryMode;
  readonly cycleStartDay = this.state.cycleStartDay;
  readonly loading = this.state.loading;
  readonly error = this.state.error;

  /**
   * Reactive envelopes computed automatically from categories + currentMonthExpenses signals.
   * Any new expense instantly updates envelopes without reload or click.
   */
  readonly envelopes = computed<CategoryEnvelopeView[]>(() => {
    const categories = this.state.categories();
    const monthExpenses = this.expensesFacade.currentMonthExpenses();

    const spentByCategory = new Map<string, number>();
    for (const exp of monthExpenses) {
      const cur = spentByCategory.get(exp.categoryId) || 0;
      spentByCategory.set(exp.categoryId, cur + exp.amount);
    }

    return categories.map(cat => {
      const allocated = cat.monthlyAllocationGhs || 50;
      const spent = spentByCategory.get(cat.id) || 0;
      const percentage = Math.min(100, Math.round((spent / allocated) * 100));

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentage >= 90) {
        status = 'danger';
      } else if (percentage >= 70) {
        status = 'warning';
      }

      return {
        category: cat,
        spentGhs: spent,
        allocatedGhs: allocated,
        percentage,
        status
      };
    });
  });

  /**
   * Reactive overall budget consumption (balance, percentage spent, status)
   */
  readonly consumption = computed<BudgetConsumption>(() => {
    const totalCeiling = this.totalBudgetCeilingGhs();
    const totalSpent = this.expensesFacade.currentMonthTotalSpent();
    const isDiscovery = this.isDiscoveryMode();
    const cycleDay = this.cycleStartDay();
    return this.calculator.calculateConsumption(totalCeiling, totalSpent, isDiscovery, cycleDay);
  });

  /**
   * Reactive budget days remaining calculation
   */
  readonly budgetDaysInfo = computed<BudgetDaysCalculation>(() => {
    const balance = this.consumption().balanceGhs;
    const monthExpenses = this.expensesFacade.currentMonthExpenses();
    const plannedDaily = this.plannedDailyBudgetGhs();
    return this.calculator.calculateBudgetDays(balance, monthExpenses, plannedDaily);
  });

  async load(): Promise<void> {
    this.state.setLoading(true);
    this.state.setError(null);
    try {
      const [categories, budget] = await Promise.all([
        this.repo.getCategories(),
        this.repo.getMonthlyBudget()
      ]);
      this.state.setCategories(categories);
      this.state.setMonthlyBudget(budget);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load budget';
      this.state.setError(msg);
    } finally {
      this.state.setLoading(false);
    }
  }

  async saveMonthlyBudget(budget: MonthlyBudget): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.saveMonthlyBudget(budget);
      this.state.setMonthlyBudget(budget);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save monthly budget';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async addCategory(cat: Category): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.addCategory(cat);
      this.state.upsertCategory(cat);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save category';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }
}
