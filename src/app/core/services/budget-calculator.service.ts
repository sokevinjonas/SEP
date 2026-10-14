import { Injectable } from '@angular/core';
import { Expense, MonthlyBudget } from '../models/financial.models';

export interface BudgetDaysCalculation {
  days: number;
  basis: '(planned)' | '(average)';
  distinctDaysCount: number;
  dailyBurnRateGhs: number;
}

export interface BudgetConsumption {
  totalBudgetGhs: number;
  totalSpentGhs: number;
  balanceGhs: number;
  consumedPercent: number;
  status: 'safe' | 'warning' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class BudgetCalculatorService {
  /**
   * Calculates the remaining Budget Days according to FR2 specification:
   * - If distinct days of expense logging < 7: use planned daily budget (default 20 GHS/day) with '(planned)' basis.
   * - If distinct days of expense logging >= 7: use actual daily average with '(average)' basis.
   */
  calculateBudgetDays(
    balanceGhs: number,
    monthExpenses: Expense[],
    plannedDailyBudgetGhs = 20
  ): BudgetDaysCalculation {
    const distinctDaysSet = new Set(monthExpenses.map(e => e.date.substring(0, 10)));
    const distinctDaysCount = distinctDaysSet.size;

    if (distinctDaysCount < 7) {
      const dailyBurnRate = plannedDailyBudgetGhs > 0 ? plannedDailyBudgetGhs : 20;
      const days = dailyBurnRate > 0 ? Math.round(balanceGhs / dailyBurnRate) : 0;
      return {
        days: Math.max(0, days),
        basis: '(planned)',
        distinctDaysCount,
        dailyBurnRateGhs: dailyBurnRate
      };
    }

    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const dailyAverage = totalSpent / distinctDaysCount;
    const days = dailyAverage > 0 ? Math.round(balanceGhs / dailyAverage) : 30;

    return {
      days: Math.max(0, days),
      basis: '(average)',
      distinctDaysCount,
      dailyBurnRateGhs: parseFloat(dailyAverage.toFixed(2))
    };
  }

  /**
   * Computes budget consumption and health status
   */
  calculateConsumption(totalBudgetGhs: number, totalSpentGhs: number): BudgetConsumption {
    const safeTotal = totalBudgetGhs > 0 ? totalBudgetGhs : 600;
    const balanceGhs = Math.max(0, safeTotal - totalSpentGhs);
    const consumedPercent = Math.min(100, Math.round((totalSpentGhs / safeTotal) * 100));

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (consumedPercent >= 90) {
      status = 'danger';
    } else if (consumedPercent >= 70) {
      status = 'warning';
    }

    return {
      totalBudgetGhs: safeTotal,
      totalSpentGhs,
      balanceGhs,
      consumedPercent,
      status
    };
  }

  /**
   * Reframes a purchase amount into tangible student equivalents:
   * e.g. "X repas au campus" (assuming ~15 GHS per meal at Legon)
   */
  reframeInMeals(amountGhs: number, mealCostGhs = 15): number {
    return mealCostGhs > 0 ? Math.round(amountGhs / mealCostGhs) : 0;
  }
}
