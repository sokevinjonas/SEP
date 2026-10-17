import { Injectable, inject, computed } from '@angular/core';
import { BudgetState } from '../state/budget.state';
import { BudgetRepository } from '../data-access/budget.repository';
import { ExpensesFacade } from '../../expenses/facade/expenses.facade';
import { ProfileFacade } from '../../profile/facade/profile.facade';
import { BudgetCalculatorService, BudgetConsumption, BudgetDaysCalculation } from '../../../core/services/budget-calculator.service';
import {
  Category,
  MonthlyBudget,
  CategoryEnvelopeView,
  CoachAdvice,
  AiBudgetRecommendation,
  calculateAiSuggestedBudget
} from '../domain/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetFacade {
  private readonly state = inject(BudgetState);
  private readonly repo = inject(BudgetRepository);
  private readonly expensesFacade = inject(ExpensesFacade);
  private readonly profileFacade = inject(ProfileFacade);
  private readonly calculator = inject(BudgetCalculatorService);

  readonly categories = this.state.categories;
  readonly monthlyBudget = this.state.monthlyBudget;
  readonly totalBudgetAllocatedGhs = this.state.totalBudgetAllocatedGhs;
  readonly totalBudgetCeilingGhs = this.state.totalBudgetCeilingGhs;
  readonly plannedDailyBudgetGhs = this.state.plannedDailyBudgetGhs;
  readonly isDiscoveryMode = this.state.isDiscoveryMode;
  readonly discoveryCompleted = this.state.discoveryCompleted;
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

  /**
   * Dynamic coaching advice quote based on current financial health & mode
   */
  readonly coachAdvice = computed<CoachAdvice>(() => {
    const isDisc = this.isDiscoveryMode();
    if (isDisc) {
      return {
        badge: 'Discovery Observation',
        quote: 'Log every single campus expense! I am analyzing your real spending velocity to propose your ideal monthly budget.',
        status: 'safe'
      };
    }

    const status = this.consumption().status;
    if (status === 'safe') {
      return {
        badge: 'Runway Protected',
        quote: 'Disciplined student! Your envelopes are healthy. Keep resisting impulse spending and your fund will thrive!',
        status: 'safe'
      };
    } else if (status === 'warning') {
      return {
        badge: 'Envelopes Running Warm',
        quote: 'Some envelopes have exceeded 70%. Prioritize campus dining over outside restaurants this week!',
        status: 'warning'
      };
    } else {
      return {
        badge: 'Ceiling Alert',
        quote: `Monthly allowance nearly exhausted! Freeze discretionary purchases until day ${this.cycleStartDay() || 1}.`,
        status: 'danger'
      };
    }
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

  /**
   * Helper to retrieve single CategoryEnvelopeView by categoryId
   */
  getEnvelopeByCategory(categoryId: string): CategoryEnvelopeView | undefined {
    return this.envelopes().find(e => e.category.id === categoryId);
  }

  /**
   * Updates allocation for a single envelope
   */
  async updateCategoryAllocation(categoryId: string, newAllocationGhs: number): Promise<void> {
    const categories = this.state.categories();
    const target = categories.find(c => c.id === categoryId);
    if (!target) return;
    const updated: Category = {
      ...target,
      monthlyAllocationGhs: Math.max(0, newAllocationGhs)
    };
    await this.addCategory(updated);
  }

  /**
   * Orchestrates complete budget strategy update and profile synchronization
   */
  async saveBudgetStrategy(
    mode: 'fixed' | 'discovery',
    totalCeilingGhs: number,
    cycleStartDay: number,
    categories: Category[]
  ): Promise<void> {
    const isDisc = mode === 'discovery';
    const ceiling = isDisc ? 0 : Math.max(10, Number(totalCeilingGhs) || 0);
    const cycleDay = Math.min(28, Math.max(1, Number(cycleStartDay) || 1));

    const current = this.state.monthlyBudget();
    const updatedBudget: MonthlyBudget = {
      id: current?.id || 'current',
      monthYear: current?.monthYear || new Date().toISOString().substring(0, 7),
      totalBudgetGhs: ceiling,
      plannedDailyBudgetGhs: isDisc ? 0 : Math.round(ceiling / 30),
      exchangeRateXof: current?.exchangeRateXof || 42.0,
      isDiscoveryMode: isDisc,
      cycleStartDay: cycleDay
    };

    await this.saveMonthlyBudget(updatedBudget);

    // Save updated category envelope allocations
    for (const cat of categories) {
      await this.addCategory({
        ...cat,
        monthlyAllocationGhs: Number(cat.monthlyAllocationGhs) || 0
      });
    }

    // Synchronize with user profile
    const profile = this.profileFacade.userProfile();
    if (profile) {
      await this.profileFacade.saveUserProfile({
        ...profile,
        budgetMode: mode,
        cycleStartDay: cycleDay,
        updatedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Calculates AI recommendation data based on actual spending telemetry
   */
  getAiBudgetSuggestion(): AiBudgetRecommendation {
    const totalSpent = this.consumption().totalSpentGhs;
    const daysElapsed = this.consumption().cycleDaysElapsed || 1;
    const daysTotal = this.consumption().cycleDaysTotal || 30;
    const cycleDay = this.consumption().cycleStartDay || 1;
    const monthExpenses = this.expensesFacade.currentMonthExpenses();
    const categories = this.state.categories();

    // 1. Spending breakdown by category
    const catMap = new Map<string, number>();
    for (const exp of monthExpenses) {
      const cur = catMap.get(exp.categoryId) || 0;
      catMap.set(exp.categoryId, cur + exp.amount);
    }

    let topCatName = 'Food & Chop';
    let topCatSpent = 0;
    let topCatPercent = 0;

    for (const cat of categories) {
      const spent = catMap.get(cat.id) || 0;
      if (spent > topCatSpent) {
        topCatSpent = spent;
        topCatName = cat.name;
      }
    }

    if (totalSpent > 0) {
      topCatPercent = Math.round((topCatSpent / totalSpent) * 100);
    }

    const dailyBurnRate = Number((totalSpent / Math.max(1, daysElapsed)).toFixed(2));

    // 2. Projected ceiling (with 10% safety cushion)
    let suggestedBudget = 600;
    if (totalSpent > 0 && daysElapsed > 0) {
      const projected = (totalSpent / daysElapsed) * daysTotal;
      suggestedBudget = Math.max(150, Math.round((projected * 1.1) / 50) * 50);
    }

    // 3. Proportional envelope breakdown
    const defaultWeights: Record<string, number> = {
      'cat-food': 0.45,
      'cat-transport': 0.20,
      'cat-books': 0.15,
      'cat-social': 0.10,
      'cat-utilities': 0.05,
      'cat-other': 0.05
    };

    const suggestedBreakdown = categories.map(cat => {
      let weight = defaultWeights[cat.id] || 0.10;
      if (totalSpent > 0 && catMap.has(cat.id)) {
        const actualShare = (catMap.get(cat.id) || 0) / totalSpent;
        // Blend actual share with a floor to guarantee essential runway
        weight = Math.max(0.08, actualShare);
      }

      const allocation = Math.max(20, Math.round((suggestedBudget * weight) / 10) * 10);
      const percentage = Math.round((allocation / suggestedBudget) * 100);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        suggestedAllocationGhs: allocation,
        percentage
      };
    });

    // 4. Strategic conclusions by M. Pognon
    const conclusions: string[] = [];
    if (totalSpent <= 0) {
      conclusions.push('No expenses recorded during discovery: initialized safe campus baseline of 600 GHS.');
      conclusions.push('Recommended 45% allocation to food to prevent dorm food insecurity.');
      conclusions.push('Allocated 20% for daily campus transit and trotro shuttles.');
    } else {
      conclusions.push(`Observed average spend rate: ${dailyBurnRate.toFixed(2)} GHS per day across ${daysElapsed} day(s).`);
      conclusions.push(`${topCatName} was your dominant outflow, consuming ${topCatPercent}% of your campus cash.`);
      conclusions.push(`A target ceiling of ${suggestedBudget} GHS includes a 10% safety reserve against semester exam emergencies.`);
    }

    return {
      suggestedBudget,
      totalSpent,
      daysElapsed,
      daysTotal,
      cycleStartDay: cycleDay,
      dailyBurnRate,
      topCategoryName: topCatName,
      topCategorySpent: topCatSpent,
      topCategoryPercent: topCatPercent,
      conclusions,
      suggestedBreakdown
    };
  }

  /**
   * Adopts AI proposed ceiling, automatically configures all category envelopes (CRUD),
   * sets discoveryCompleted: true, and switches mode to fixed.
   */
  async adoptAiSuggestedBudget(
    suggestedBudget: number,
    breakdown?: { categoryId: string; categoryName: string; suggestedAllocationGhs: number; percentage: number }[]
  ): Promise<void> {
    const cycleDay = this.consumption().cycleStartDay || 1;
    const currentBudget = this.state.monthlyBudget();
    const nowIso = new Date().toISOString();

    const updatedBudget: MonthlyBudget = {
      id: currentBudget?.id || 'current',
      monthYear: currentBudget?.monthYear || nowIso.substring(0, 7),
      totalBudgetGhs: suggestedBudget,
      exchangeRateXof: currentBudget?.exchangeRateXof || 42.0,
      plannedDailyBudgetGhs: Math.round(suggestedBudget / 30),
      isDiscoveryMode: false,
      discoveryCompleted: true,
      discoveryCompletedAt: nowIso,
      cycleStartDay: cycleDay,
      aiSuggestedBudgetGhs: suggestedBudget,
      aiSuggestedBreakdown: breakdown
    };
    await this.saveMonthlyBudget(updatedBudget);

    // M. Pognon performs automated CRUD updates across all category envelopes
    if (breakdown && breakdown.length > 0) {
      for (const item of breakdown) {
        await this.updateCategoryAllocation(item.categoryId, item.suggestedAllocationGhs);
      }
    }

    const profile = this.profileFacade.userProfile();
    if (profile) {
      await this.profileFacade.saveUserProfile({
        ...profile,
        budgetMode: 'fixed',
        cycleStartDay: cycleDay,
        discoveryCompleted: true,
        discoveryCompletedAt: nowIso,
        updatedAt: nowIso
      });
    }
  }

  /**
   * Top-up allowance (e.g. MoMo transfer from parents or campus wages)
   */
  async addAllowanceTopUp(amountGhs: number, targetEnvelopeId?: string): Promise<void> {
    const current = this.state.monthlyBudget();
    const currentCeiling = current?.totalBudgetGhs || 0;
    const newCeiling = currentCeiling + amountGhs;
    const isDisc = current?.isDiscoveryMode || false;

    const updatedBudget: MonthlyBudget = {
      id: current?.id || 'current',
      monthYear: current?.monthYear || new Date().toISOString().substring(0, 7),
      totalBudgetGhs: newCeiling,
      plannedDailyBudgetGhs: isDisc ? 0 : Math.round(newCeiling / 30),
      exchangeRateXof: current?.exchangeRateXof || 42.0,
      isDiscoveryMode: isDisc,
      cycleStartDay: current?.cycleStartDay || 1
    };
    await this.saveMonthlyBudget(updatedBudget);

    // If an envelope was selected to receive the top-up, adjust its allocation
    if (targetEnvelopeId) {
      const cat = this.state.categories().find(c => c.id === targetEnvelopeId);
      if (cat) {
        await this.addCategory({
          ...cat,
          monthlyAllocationGhs: (cat.monthlyAllocationGhs || 0) + amountGhs
        });
      }
    }
  }

  /**
   * Cycle Rollover: Closes out current cycle, calculates surplus/deficit,
   * and either rolls over surplus to next cycle or deposits into Student Savings Vault.
   */
  async executeCycleRollover(action: 'rollover_to_budget' | 'save_to_vault'): Promise<{
    surplusGhs: number;
    newCeilingGhs: number;
    newSavingsVaultGhs: number;
  }> {
    const consumption = this.consumption();
    const surplusGhs = Math.max(0, consumption.balanceGhs);
    const currentBudget = this.state.monthlyBudget();
    const baseCeiling = currentBudget?.totalBudgetGhs || 600;

    let newCeiling = baseCeiling;
    let newSavingsVault = 0;

    const profile = this.profileFacade.userProfile();
    const currentVault = profile?.savingsVaultGhs || 0;

    if (action === 'rollover_to_budget') {
      newCeiling = baseCeiling + surplusGhs;
      newSavingsVault = currentVault;
    } else {
      // save_to_vault
      newCeiling = baseCeiling;
      newSavingsVault = currentVault + surplusGhs;
    }

    if (profile) {
      await this.profileFacade.saveUserProfile({
        ...profile,
        savingsVaultGhs: newSavingsVault,
        updatedAt: new Date().toISOString()
      });
    }

    const updatedBudget: MonthlyBudget = {
      id: currentBudget?.id || 'current',
      monthYear: new Date().toISOString().substring(0, 7),
      totalBudgetGhs: newCeiling,
      plannedDailyBudgetGhs: Math.round(newCeiling / 30),
      exchangeRateXof: currentBudget?.exchangeRateXof || 42.0,
      isDiscoveryMode: false,
      cycleStartDay: currentBudget?.cycleStartDay || 1
    };

    await this.saveMonthlyBudget(updatedBudget);

    return {
      surplusGhs,
      newCeilingGhs: newCeiling,
      newSavingsVaultGhs: newSavingsVault
    };
  }
}
