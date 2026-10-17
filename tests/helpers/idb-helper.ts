import { Page } from '@playwright/test';

export const SEED_CATEGORIES = [
  { id: 'cat-food', name: 'Food & Chop', icon: 'restaurant-outline', monthlyAllocationGhs: 300, color: '#714B67' },
  { id: 'cat-transport', name: 'Transport & Trotro', icon: 'bus-outline', monthlyAllocationGhs: 100, color: '#017e84' },
  { id: 'cat-books', name: 'Books & Copies', icon: 'book-outline', monthlyAllocationGhs: 80, color: '#58354f' },
  { id: 'cat-social', name: 'Campus & Social', icon: 'people-outline', monthlyAllocationGhs: 70, color: '#ffac00' },
  { id: 'cat-utilities', name: 'Data & Utilities', icon: 'flash-outline', monthlyAllocationGhs: 50, color: '#c0392b' },
  { id: 'cat-other', name: 'Other', icon: 'ellipsis-horizontal-circle-outline', monthlyAllocationGhs: 50, color: '#6B5966' },
];

export async function seedOnboardedUser(page: Page) {
  await page.goto('/');
  await page.evaluate(async (categories) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('sep_local_db', 2);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
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
      };
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const tx = db.transaction(['user_profile', 'monthly_budgets', 'categories'], 'readwrite');
        tx.objectStore('user_profile').put({
          id: 'current_user',
          name: 'Jonas',
          country: 'Ghana',
          city: 'Accra',
          campus: 'University of Ghana (Legon)',
          primaryCurrency: 'GHS',
          hasCompletedOnboarding: true,
          budgetMode: 'discovery',
          discoveryCompleted: false,
          cycleStartDay: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        tx.objectStore('monthly_budgets').put({
          id: '2026-10',
          monthYear: '2026-10',
          totalBudgetGhs: 600.0,
          plannedDailyBudgetGhs: 20.0,
          exchangeRateXof: 42.0,
          isDiscoveryMode: false,
          discoveryCompleted: false,
          cycleStartDay: 1,
        });
        const catStore = tx.objectStore('categories');
        for (const cat of categories) {
          catStore.put(cat);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, SEED_CATEGORIES);

  // Reload page to let Angular services pick up the seeded database
  await page.goto('/tabs/home');
  await page.waitForLoadState('networkidle');
}

export async function clearAllLocalData(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('sep_local_db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
}
