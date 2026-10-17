import { Category, MonthlyBudget } from '../../../core/models/financial.models';

export { Category, MonthlyBudget } from '../../../core/models/financial.models';

export interface CategoryEnvelopeView {
  category: Category;
  spentGhs: number;
  allocatedGhs: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

export interface CoachAdvice {
  badge: string;
  quote: string;
  status: 'safe' | 'warning' | 'danger';
}

export interface AiBudgetRecommendation {
  suggestedBudget: number;
  totalSpent: number;
  daysElapsed: number;
  daysTotal: number;
  cycleStartDay: number;
  dailyBurnRate: number;
  topCategoryName: string;
  topCategorySpent: number;
  topCategoryPercent: number;
  conclusions: string[];
  suggestedBreakdown: {
    categoryId: string;
    categoryName: string;
    suggestedAllocationGhs: number;
    percentage: number;
  }[];
}

/**
 * Returns the matching Ionic icon name for a given financial category
 */
export function getCategoryIcon(catId: string): string {
  switch (catId) {
    case 'cat-food': return 'restaurant-outline';
    case 'cat-transport': return 'bus-outline';
    case 'cat-books': return 'book-outline';
    case 'cat-social': return 'people-outline';
    case 'cat-utilities': return 'flash-outline';
    default: return 'ellipsis-horizontal-circle-outline';
  }
}

/**
 * Returns the dedicated UI theme color for a category
 */
export function getCategoryColor(catId: string): string {
  switch (catId) {
    case 'cat-food': return '#E67E22';
    case 'cat-transport': return '#2980B9';
    case 'cat-books': return '#27AE60';
    case 'cat-social': return '#8E44AD';
    case 'cat-utilities': return '#D35400';
    default: return '#714B67';
  }
}

/**
 * Pure domain logic: computes projected AI budget based on real student spending velocity
 */
export function calculateAiSuggestedBudget(
  totalSpent: number,
  daysElapsed: number,
  daysTotal: number = 30
): number {
  if (totalSpent <= 0 || daysElapsed <= 0) {
    return 600;
  }
  const projected = (totalSpent / daysElapsed) * daysTotal;
  return Math.max(100, Math.round(projected / 50) * 50);
}
