import { Injectable, signal, computed } from '@angular/core';
import { Expense } from '../domain/expense.model';
import { currentMonthKey } from '../../../core/db/idb.service';

@Injectable({ providedIn: 'root' })
export class ExpensesState {
  private readonly _expenses = signal<Expense[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly expenses = this._expenses.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly recentExpenses = computed(() => this._expenses().slice(0, 5));

  readonly currentMonthExpenses = computed(() => {
    const key = currentMonthKey();
    return this._expenses().filter(e => e.date.startsWith(key));
  });

  readonly currentMonthTotalSpent = computed(() =>
    this.currentMonthExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  readonly count = computed(() => this._expenses().length);

  setExpenses(data: Expense[]): void {
    this._expenses.set(data);
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  setError(msg: string | null): void {
    this._error.set(msg);
  }

  append(expense: Expense): void {
    this._expenses.update(list => [expense, ...list]);
  }

  remove(id: string): void {
    this._expenses.update(list => list.filter(e => e.id !== id));
  }
}
