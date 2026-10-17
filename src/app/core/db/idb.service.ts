import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Expense, Category, MonthlyBudget, Purchase, SyncItem, UserProfile, SepBackupData } from '../models/financial.models';

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
  { id: 'cat-food', name: 'Food & Chop', icon: 'restaurant-outline', monthlyAllocationGhs: 0, color: '#714B67' },
  { id: 'cat-transport', name: 'Transport & Trotro', icon: 'bus-outline', monthlyAllocationGhs: 0, color: '#017e84' },
  { id: 'cat-books', name: 'Books & Copies', icon: 'book-outline', monthlyAllocationGhs: 0, color: '#58354f' },
  { id: 'cat-social', name: 'Campus & Social', icon: 'people-outline', monthlyAllocationGhs: 0, color: '#ffac00' },
  { id: 'cat-utilities', name: 'Data & Utilities', icon: 'flash-outline', monthlyAllocationGhs: 0, color: '#8d6482' },
  { id: 'cat-other', name: 'Other', icon: 'ellipsis-horizontal-circle-outline', monthlyAllocationGhs: 0, color: '#6B5966' },
];

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

  /** Structural category schemas only. Never seeds fake budgets or mock profiles. */
  private async ensureDefaults(db: SepDb): Promise<void> {
    if ((await db.count('categories')) === 0) {
      const tx = db.transaction('categories', 'readwrite');
      for (const cat of DEFAULT_CATEGORIES) {
        await tx.store.put(cat);
      }
      await tx.done;
    }

    // Purge legacy demo rows if present
    for (const exp of await db.getAll('expenses')) {
      if (exp.id.startsWith('exp-demo-')) await db.delete('expenses', exp.id);
    }
    for (const pur of await db.getAll('purchases')) {
      if (pur.id.startsWith('pur-demo-')) await db.delete('purchases', pur.id);
    }

    // Purge legacy fake default profile if present
    const existingProfile = await db.get('user_profile', 'current_user');
    if (existingProfile && (existingProfile.name === 'Campus Student' || (!existingProfile.name && !existingProfile.hasCompletedOnboarding))) {
      await db.delete('user_profile', 'current_user');
    }

    // Purge legacy fake default 600 GHS budget if present
    const key = currentMonthKey();
    const existingBudget = await db.get('monthly_budgets', key);
    if (existingBudget && existingBudget.totalBudgetGhs === 600 && existingBudget.plannedDailyBudgetGhs === 20 && !existingBudget.isDiscoveryMode && !existingBudget.discoveryCompleted) {
      await db.delete('monthly_budgets', key);
    }
  }

  /** Wipes transactional data and clears all stores to a pristine state. */
  async resetAll(): Promise<void> {
    const db = await this.db;
    await db.clear('expenses');
    await db.clear('purchases');
    await db.clear('sync_queue');
    await db.clear('monthly_budgets');
    await db.clear('user_profile');

    const categories = await db.getAll('categories');
    const tx = db.transaction('categories', 'readwrite');
    for (const cat of categories) {
      cat.monthlyAllocationGhs = 0;
      await tx.store.put(cat);
    }
    await tx.done;
  }

  /** Dumps all stores into a single portable backup structure. */
  async exportAllData(): Promise<SepBackupData> {
    const db = await this.db;
    const [expenses, purchases, categories, monthlyBudgets, userProfile] = await Promise.all([
      db.getAll('expenses'),
      db.getAll('purchases'),
      db.getAll('categories'),
      db.getAll('monthly_budgets'),
      db.get('user_profile', 'current_user')
    ]);

    const activeBudget = monthlyBudgets.find(b => b.id === currentMonthKey()) || monthlyBudgets[0] || null;

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      userProfile: userProfile || null,
      monthlyBudget: activeBudget,
      categories: categories || [],
      expenses: expenses || [],
      purchases: purchases || []
    };
  }

  /** Restores all stores from a backup structure. */
  async restoreAllData(data: SepBackupData): Promise<{ expenses: number; purchases: number; categories: number }> {
    const db = await this.db;

    // 1. Restore Profile
    if (data.userProfile) {
      await db.put('user_profile', {
        ...data.userProfile,
        id: 'current_user'
      });
    }

    // 2. Restore Monthly Budget
    if (data.monthlyBudget) {
      await db.put('monthly_budgets', data.monthlyBudget);
    }

    // 3. Restore Categories
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      await db.clear('categories');
      const txCat = db.transaction('categories', 'readwrite');
      for (const cat of data.categories) {
        await txCat.store.put(cat);
      }
      await txCat.done;
    }

    // 4. Restore Expenses
    let expCount = 0;
    if (Array.isArray(data.expenses)) {
      await db.clear('expenses');
      const txExp = db.transaction('expenses', 'readwrite');
      for (const exp of data.expenses) {
        await txExp.store.put(exp);
        expCount++;
      }
      await txExp.done;
    }

    // 5. Restore Purchases
    let purCount = 0;
    if (Array.isArray(data.purchases)) {
      await db.clear('purchases');
      const txPur = db.transaction('purchases', 'readwrite');
      for (const pur of data.purchases) {
        await txPur.store.put(pur);
        purCount++;
      }
      await txPur.done;
    }

    return {
      expenses: expCount,
      purchases: purCount,
      categories: data.categories?.length || 0
    };
  }
}
