import { Injectable, inject } from '@angular/core';
import { ExpensesState } from '../state/expenses.state';
import { ExpensesRepository } from '../data-access/expenses.repository';
import { Expense } from '../domain/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpensesFacade {
  private readonly state = inject(ExpensesState);
  private readonly repo = inject(ExpensesRepository);

  readonly expenses = this.state.expenses;
  readonly recentExpenses = this.state.recentExpenses;
  readonly currentMonthExpenses = this.state.currentMonthExpenses;
  readonly currentMonthTotalSpent = this.state.currentMonthTotalSpent;
  readonly count = this.state.count;
  readonly loading = this.state.loading;
  readonly error = this.state.error;

  async load(): Promise<Expense[]> {
    this.state.setLoading(true);
    this.state.setError(null);
    try {
      const data = await this.repo.getAll();
      this.state.setExpenses(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load expenses';
      this.state.setError(msg);
      return [];
    } finally {
      this.state.setLoading(false);
    }
  }

  async addExpense(expense: Expense): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.add(expense);
      // Immediately reflect in reactive state so UI re-renders without full reload or click
      this.state.append(expense);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add expense';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async deleteExpense(id: string): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.delete(id);
      this.state.remove(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete expense';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async updateExpense(expense: Expense): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.update(expense);
      this.state.update(expense);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update expense';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async checkDuplicateReference(ref: string): Promise<Expense | undefined> {
    return this.repo.checkDuplicateReference(ref);
  }

  getExpensesByCategory(categoryId: string): Expense[] {
    return this.expenses()
      .filter(e => e.categoryId === categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

