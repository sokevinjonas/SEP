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

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<SepDbSchema>>;

  constructor() {
    this.dbPromise = this.initDb();
  }

  private async initDb(): Promise<IDBPDatabase<SepDbSchema>> {
    return openDB<SepDbSchema>('sep_local_db', 2, {
      upgrade(db) {
        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('by-date', 'date');
          expenseStore.createIndex('by-category', 'categoryId');
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Monthly Budgets store
        if (!db.objectStoreNames.contains('monthly_budgets')) {
          db.createObjectStore('monthly_budgets', { keyPath: 'id' });
        }

        // Purchases store (Anti-pulsion / Wishlist)
        if (!db.objectStoreNames.contains('purchases')) {
          const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' });
          purchaseStore.createIndex('by-status', 'status');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
        }

        // User profile store
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', { keyPath: 'id' });
        }
      }
    }).then(async (db) => {
      await this.seedDefaultsIfEmpty(db);
      return db;
    });
  }

  private async seedDefaultsIfEmpty(db: IDBPDatabase<SepDbSchema>): Promise<void> {
    const catCount = await db.count('categories');
    if (catCount === 0) {
      const defaultCategories: Category[] = [
        { id: 'cat-food', name: 'Nourriture & Chop', icon: 'restaurant-outline', monthlyAllocationGhs: 300, color: '#714B67' },
        { id: 'cat-transport', name: 'Transport / Trotro', icon: 'bus-outline', monthlyAllocationGhs: 100, color: '#017e84' },
        { id: 'cat-books', name: 'Polys & Livres', icon: 'book-outline', monthlyAllocationGhs: 80, color: '#58354f' },
        { id: 'cat-social', name: 'Sorties & Campus', icon: 'people-outline', monthlyAllocationGhs: 70, color: '#ffac00' },
        { id: 'cat-utilities', name: 'Forfait Data & Énergie', icon: 'flash-outline', monthlyAllocationGhs: 50, color: '#c0392b' },
        { id: 'cat-other', name: 'Autre', icon: 'ellipsis-horizontal-circle-outline', monthlyAllocationGhs: 50, color: '#6B5966' },
      ];

      const tx = db.transaction('categories', 'readwrite');
      for (const cat of defaultCategories) {
        await tx.store.put(cat);
      }
      await tx.done;
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budget = await db.get('monthly_budgets', currentMonthKey);
    if (!budget) {
      await db.put('monthly_budgets', {
        id: currentMonthKey,
        monthYear: currentMonthKey,
        totalBudgetGhs: 600.0,
        plannedDailyBudgetGhs: 20.0,
        exchangeRateXof: 42.0
      });
    }

    // Seed initial demo expenses if empty for first launch richness
    const expCount = await db.count('expenses');
    if (expCount === 0) {
      const demoExpenses: Expense[] = [
        {
          id: 'exp-demo-1',
          amount: 5.0,
          currency: 'GHS',
          categoryId: 'cat-transport',
          categoryName: 'Transport / Trotro',
          merchant: 'Campus Shuttle',
          note: 'Navette matin',
          date: new Date(Date.now() - 3600000 * 2).toISOString(),
          source: 'manual',
          createdAt: new Date().toISOString()
        },
        {
          id: 'exp-demo-2',
          amount: 18.0,
          currency: 'GHS',
          categoryId: 'cat-food',
          categoryName: 'Nourriture & Chop',
          merchant: 'Waakye Joint',
          note: 'Waakye & Œuf',
          date: new Date(Date.now() - 86400000).toISOString(),
          source: 'manual',
          createdAt: new Date().toISOString()
        },
        {
          id: 'exp-demo-3',
          amount: 12.0,
          currency: 'GHS',
          categoryId: 'cat-books',
          categoryName: 'Polys & Livres',
          merchant: 'Repro Legon',
          note: 'Polycopiés de cours',
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          source: 'manual',
          createdAt: new Date().toISOString()
        }
      ];

      const tx = db.transaction('expenses', 'readwrite');
      for (const exp of demoExpenses) {
        await tx.store.put(exp);
      }
      await tx.done;
    }

    // Seed initial avoided purchase for Avoided Total counter
    const purCount = await db.count('purchases');
    if (purCount === 0) {
      await db.put('purchases', {
        id: 'pur-demo-1',
        title: 'Casque Bluetooth Anker',
        amountGhs: 180.0,
        costInBudgetDays: 9,
        reframingText: 'Cela représente 9 jours de repas sur le campus.',
        status: 'abandoned',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        expiresAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        resolvedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      });
    }

    // Seed initial user profile if empty
    const profile = await db.get('user_profile', 'current_user');
    if (!profile) {
      await db.put('user_profile', {
        id: 'current_user',
        name: 'Jonas',
        city: 'Accra',
        campus: 'Campus Legon',
        primaryCurrency: 'GHS',
        hasCompletedOnboarding: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Expense Methods
  async getExpenses(): Promise<Expense[]> {
    const db = await this.dbPromise;
    const all = await db.getAll('expenses');
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async addExpense(expense: Expense): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['expenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('expenses').put(expense);
    await tx.objectStore('sync_queue').put({
      id: `sync-${expense.id}`,
      entity: 'expense',
      action: 'create',
      payload: expense,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await tx.done;
  }

  async deleteExpense(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['expenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('expenses').delete(id);
    await tx.objectStore('sync_queue').put({
      id: `sync-del-${id}`,
      entity: 'expense',
      action: 'delete',
      payload: { id },
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await tx.done;
  }

  // Category Methods
  async getCategories(): Promise<Category[]> {
    const db = await this.dbPromise;
    return db.getAll('categories');
  }

  async addCategory(category: Category): Promise<void> {
    const db = await this.dbPromise;
    await db.put('categories', category);
  }

  // Budget Methods
  async getMonthlyBudget(monthKey?: string): Promise<MonthlyBudget> {
    const db = await this.dbPromise;
    const key = monthKey || this.getCurrentMonthKey();
    const budget = await db.get('monthly_budgets', key);
    if (budget) return budget;

    const fallback: MonthlyBudget = {
      id: key,
      monthYear: key,
      totalBudgetGhs: 600.0,
      plannedDailyBudgetGhs: 20.0,
      exchangeRateXof: 42.0
    };
    await db.put('monthly_budgets', fallback);
    return fallback;
  }

  async saveMonthlyBudget(budget: MonthlyBudget): Promise<void> {
    const db = await this.dbPromise;
    await db.put('monthly_budgets', budget);
  }

  // Purchase Methods (Anti-Pulsion & Wishlist)
  async getPurchases(statusFilter?: 'pending' | 'bought' | 'abandoned'): Promise<Purchase[]> {
    const db = await this.dbPromise;
    if (statusFilter) {
      return db.getAllFromIndex('purchases', 'by-status', statusFilter);
    }
    const all = await db.getAll('purchases');
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addPurchase(purchase: Purchase): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['purchases', 'sync_queue'], 'readwrite');
    await tx.objectStore('purchases').put(purchase);
    await tx.objectStore('sync_queue').put({
      id: `sync-pur-${purchase.id}`,
      entity: 'purchase',
      action: 'create',
      payload: purchase,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await tx.done;
  }

  async updatePurchase(purchase: Purchase): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['purchases', 'sync_queue'], 'readwrite');
    await tx.objectStore('purchases').put(purchase);
    await tx.objectStore('sync_queue').put({
      id: `sync-pur-upd-${purchase.id}`,
      entity: 'purchase',
      action: 'update',
      payload: purchase,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await tx.done;
  }

  async getAvoidedTotal(): Promise<number> {
    const db = await this.dbPromise;
    const abandoned = await db.getAllFromIndex('purchases', 'by-status', 'abandoned');
    return abandoned.reduce((sum, p) => sum + p.amountGhs, 0);
  }

  async getSyncQueue(): Promise<SyncItem[]> {
    const db = await this.dbPromise;
    return db.getAll('sync_queue');
  }

  getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // User Profile Methods
  async getUserProfile(): Promise<UserProfile> {
    const db = await this.dbPromise;
    const profile = await db.get('user_profile', 'current_user');
    if (profile) return profile;

    const fallback: UserProfile = {
      id: 'current_user',
      name: 'Jonas',
      city: 'Accra',
      campus: 'Campus Legon',
      primaryCurrency: 'GHS',
      hasCompletedOnboarding: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.put('user_profile', fallback);
    return fallback;
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await this.dbPromise;
    profile.updatedAt = new Date().toISOString();
    await db.put('user_profile', profile);
  }
}
