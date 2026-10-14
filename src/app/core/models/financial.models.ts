export interface Expense {
  id: string;
  amount: number;
  currency: 'GHS' | 'XOF';
  categoryId: string;
  categoryName: string;
  merchant?: string;
  note?: string;
  date: string; // ISO string UTC
  source: 'manual' | 'ocr_momo' | 'ocr_receipt';
  transactionRef?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Ionicons identifier, zero emoji
  monthlyAllocationGhs: number;
  color: string;
}

export interface MonthlyBudget {
  id: string; // YYYY-MM
  monthYear: string;
  totalBudgetGhs: number;
  plannedDailyBudgetGhs: number;
  exchangeRateXof: number;
}

export interface Purchase {
  id: string;
  title: string;
  amountGhs: number;
  costInBudgetDays: number;
  reframingText: string;
  status: 'pending' | 'bought' | 'abandoned';
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
}

export interface SyncItem {
  id: string;
  entity: 'expense' | 'purchase' | 'category';
  action: 'create' | 'update' | 'delete';
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  error?: string;
}

export interface UserProfile {
  id: 'current_user';
  name: string;
  city: string;
  campus: string;
  primaryCurrency: 'GHS' | 'XOF';
  hasCompletedOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
}

