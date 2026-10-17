import { Injectable, signal, computed } from '@angular/core';
import { Category, MonthlyBudget } from '../domain/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetState {
  private readonly _categories = signal<Category[]>([]);
  private readonly _monthlyBudget = signal<MonthlyBudget | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly categories = this._categories.asReadonly();
  readonly monthlyBudget = this._monthlyBudget.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly totalBudgetAllocatedGhs = computed(() =>
    this._categories().reduce((sum, c) => sum + (c.monthlyAllocationGhs || 0), 0)
  );

  readonly totalBudgetCeilingGhs = computed(() =>
    this._monthlyBudget()?.totalBudgetGhs ?? 0
  );

  readonly plannedDailyBudgetGhs = computed(() =>
    this._monthlyBudget()?.plannedDailyBudgetGhs ?? 0
  );

  readonly isDiscoveryMode = computed(() => {
    const budget = this._monthlyBudget();
    if (budget?.discoveryCompleted) return false;
    return !!budget?.isDiscoveryMode || (budget?.totalBudgetGhs ?? 0) === 0;
  });

  readonly discoveryCompleted = computed(() =>
    !!this._monthlyBudget()?.discoveryCompleted
  );

  readonly cycleStartDay = computed(() =>
    this._monthlyBudget()?.cycleStartDay ?? 1
  );

  setCategories(data: Category[]): void {
    this._categories.set(data);
  }

  setMonthlyBudget(data: MonthlyBudget | null): void {
    this._monthlyBudget.set(data);
  }

  upsertCategory(cat: Category): void {
    this._categories.update(list => {
      const idx = list.findIndex(c => c.id === cat.id);
      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = cat;
        return copy;
      }
      return [...list, cat];
    });
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  setError(msg: string | null): void {
    this._error.set(msg);
  }
}
