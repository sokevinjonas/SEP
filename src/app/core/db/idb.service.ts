import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Expense, Category, MonthlyBudget, Purchase, SyncItem, UserProfile } from '../models/financial.models';

export interface SepDbSchema extends DBSchema {
  expenses: {
    key: string;
    value: Expense;
    indexes: { 'by-date': string; 'by-category': string };
  };
  categories: {
    key: string;
    value: Category;
  };
  monthly_budgets: {
    key: string;
    value: MonthlyBudget;
  };
  purchases: {
    key: string;
    value: Purchase;
    indexes: { 'by-status': string };
  };
  sync_queue: {
    key: string;
    value: SyncItem;
    indexes: { 'by-status': string };
  };
  user_profile: {
    key: string;
    value: UserProfile;
  };
}

export type SepDb = IDBPDatabase<SepDbSchema>;

/** Returns the current month key in the YYYY-MM format. */
export function currentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Chop', icon: 'restaurant-outline', monthlyAllocationGhs: 300, color: '#714B67' },
  { id: 'cat-transport', name: 'Transport & Trotro', icon: 'bus-outline', monthlyAllocationGhs: 100, color: '#017e84' },
  { id: 'cat-books', name: 'Books & Copies', icon: 'book-outline', monthlyAllocationGhs: 80, color: '#58354f' },
  { id: 'cat-social', name: 'Campus & Social', icon: 'people-outline', monthlyAllocationGhs: 70, color: '#ffac00' },
  { id: 'cat-utilities', name: 'Data & Utilities', icon: 'flash-outline', monthlyAllocationGhs: 50, color: '#c0392b' },
  { id: 'cat-other', name: 'Other', icon: 'ellipsis-horizontal-circle-outline', monthlyAllocationGhs: 50, color: '#6B5966' },
];

export function defaultMonthlyBudget(key: string = currentMonthKey()): MonthlyBudget {
  return { id: key, monthYear: key, totalBudgetGhs: 600.0, plannedDailyBudgetGhs: 20.0, exchangeRateXof: 42.0 };
}

export function defaultUserProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    id: 'current_user',
    name: '',
    country: 'Ghana',
    city: 'Accra',
    campus: '',
    primaryCurrency: 'GHS',
    hasCompletedOnboarding: false,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Low-level IndexedDB connection (schema + structural defaults).
 * Only `data-access` repositories should depend on this service.
 */
@Injectable({ providedIn: 'root' })
export class IdbService {
  readonly db: Promise<SepDb> = this.open();

  private open(): Promise<SepDb> {
    return openDB<SepDbSchema>('sep_local_db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('expenses')) {
          const store = db.createObjectStore('expenses', { keyPath: 'id' });
          store.createIndex('by-date', 'date');
          store.createIndex('by-category', 'categoryId');
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('monthly_budgets')) {
          db.createObjectStore('monthly_budgets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('purchases')) {
          const store = db.createObjectStore('purchases', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', { keyPath: 'id' });
        }
      }
    }).then(async (db) => {
      await this.ensureDefaults(db);
      return db;
    });
  }

  /** Structural defaults only (categories, current month budget, empty profile). Never seeds expenses. */
  private async ensureDefaults(db: SepDb): Promise<void> {
    if ((await db.count('categories')) === 0) {
      const tx = db.transaction('categories', 'readwrite');
      for (const cat of DEFAULT_CATEGORIES) {
        await tx.store.put(cat);
      }
      await tx.done;
    }

    const key = currentMonthKey();
    if (!(await db.get('monthly_budgets', key))) {
      await db.put('monthly_budgets', defaultMonthlyBudget(key));
    }

    if (!(await db.get('user_profile', 'current_user'))) {
      await db.put('user_profile', defaultUserProfile());
    }

    // Purge legacy demo rows if present
    for (const exp of await db.getAll('expenses')) {
      if (exp.id.startsWith('exp-demo-')) await db.delete('expenses', exp.id);
    }
    for (const pur of await db.getAll('purchases')) {
      if (pur.id.startsWith('pur-demo-')) await db.delete('purchases', pur.id);
    }
  }

  /** Wipes transactional data and restores structural defaults. */
  async resetAll(): Promise<void> {
    const db = await this.db;
    await db.clear('expenses');
    await db.clear('purchases');
    await db.clear('sync_queue');
    await this.ensureDefaults(db);
  }
}
