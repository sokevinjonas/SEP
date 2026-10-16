import { Injectable } from '@angular/core';
import { Expense, MonthlyBudget } from '../models/financial.models';

export interface BudgetDaysCalculation {
  days: number;
  basis: '(planned)' | '(average)';
  distinctDaysCount: number;
  dailyBurnRateGhs: number;
}

export interface CycleRangeInfo {
  startDate: Date;
  endDate: Date;
  startIso: string;
  endIso: string;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
}

export interface BudgetConsumption {
  totalBudgetGhs: number;
  totalSpentGhs: number;
  balanceGhs: number;
  consumedPercent: number;
  status: 'safe' | 'warning' | 'danger';
  isDiscoveryMode?: boolean;
  cycleStartDay?: number;
  cycleDaysTotal?: number;
  cycleDaysElapsed?: number;
  cycleDaysRemaining?: number;
  cycleProgressPercent?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetCalculatorService {
  /**
   * Computes the current cycle range based on the user's cycle start day (1 to 28).
   * Supports students receiving allowances on the 1st, 15th, 25th, etc.
   */
  getCycleRange(cycleStartDay: number = 1, now: Date = new Date()): CycleRangeInfo {
    const safeDay = Math.min(28, Math.max(1, cycleStartDay || 1));
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentDay = now.getDate();

    let startYear = year;
    let startMonth = month;
    if (currentDay < safeDay) {
      startMonth = month - 1;
      if (startMonth < 0) {
        startMonth = 11;
        startYear = year - 1;
      }
    }

    const startDate = new Date(startYear, startMonth, safeDay, 0, 0, 0, 0);

    let endMonth = startMonth + 1;
    let endYear = startYear;
    if (endMonth > 11) {
      endMonth = 0;
      endYear = startYear + 1;
    }
    const endDate = new Date(endYear, endMonth, safeDay - 1, 23, 59, 59, 999);

    const totalMs = Math.max(1, endDate.getTime() - startDate.getTime());
    const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());
    const daysTotal = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.min(daysTotal, Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1));
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);
    const progressPercent = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));

    const startIso = startDate.toISOString().split('T')[0];
    const endIso = endDate.toISOString().split('T')[0];

    return {
      startDate,
      endDate,
      startIso,
      endIso,
      daysTotal,
      daysElapsed,
      daysRemaining,
      progressPercent
    };
  }

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
   * Computes budget consumption, health status, and cycle progression.
   * Gracefully supports Discovery Mode (no ceiling yet; observing expenses for AI proposal).
   */
  calculateConsumption(
    totalBudgetGhs: number,
    totalSpentGhs: number,
    isDiscoveryMode: boolean = false,
    cycleStartDay: number = 1
  ): BudgetConsumption {
    const cycle = this.getCycleRange(cycleStartDay);

    if (isDiscoveryMode || totalBudgetGhs <= 0) {
      return {
        totalBudgetGhs: 0,
        totalSpentGhs,
        balanceGhs: 0,
        consumedPercent: 0,
        status: 'safe',
        isDiscoveryMode: true,
        cycleStartDay,
        cycleDaysTotal: cycle.daysTotal,
        cycleDaysElapsed: cycle.daysElapsed,
        cycleDaysRemaining: cycle.daysRemaining,
        cycleProgressPercent: cycle.progressPercent
      };
    }

    const safeTotal = totalBudgetGhs;
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
      status,
      isDiscoveryMode: false,
      cycleStartDay,
      cycleDaysTotal: cycle.daysTotal,
      cycleDaysElapsed: cycle.daysElapsed,
      cycleDaysRemaining: cycle.daysRemaining,
      cycleProgressPercent: cycle.progressPercent
    };
  }

  /**
   * Reframes a purchase amount into tangible student equivalents:
   * e.g. "X meals on campus" (assuming ~15 GHS per meal at Legon)
   */
  reframeInMeals(amountGhs: number, mealCostGhs = 15): number {
    return mealCostGhs > 0 ? Math.round(amountGhs / mealCostGhs) : 0;
  }
}
