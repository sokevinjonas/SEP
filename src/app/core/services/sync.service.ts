import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { IdbService } from '../db/idb.service';
import { SyncQueueRepository } from '../db/sync-queue.repository';
import { SyncItem } from '../models/financial.models';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly syncQueueRepo = inject(SyncQueueRepository);
  private readonly idbService = inject(IdbService);
  private isSyncing = false;
  private lastSyncedAt?: string;

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushPendingSync();
      });

      // Auto-flush pending mutations on app startup if already online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        setTimeout(() => {
          this.flushPendingSync();
        }, 1500);
      }
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const queue = await this.syncQueueRepo.getAll();
    const pendingItems = queue.filter((item: SyncItem) => item.status === 'pending');
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount: pendingItems.length,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt
    };
  }

  /**
   * Flushes all pending mutations and captures in FIFO order (Story 3.6).
   */
  async flushPendingSync(): Promise<number> {
    if (this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return 0;
    }

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      const queue = await this.syncQueueRepo.getAll();
      const pendingItems = queue.filter((item: SyncItem) => item.status === 'pending');
      if (pendingItems.length === 0) {
        return 0;
      }

      // Group items for batch sync
      const payloadItems = pendingItems.map((item: SyncItem) => ({
        id: item.id,
        type: item.entity,
        action: item.action,
        payload: item.payload,
        timestamp: item.createdAt
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${environment.workerUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.appSecretToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: payloadItems }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        for (const item of pendingItems) {
          item.status = 'synced';
          await this.syncQueueRepo.update(item);
          syncedCount++;
        }
        this.lastSyncedAt = new Date().toISOString();
      } else {
        console.warn('[SyncService] Backend returned non-200. Queue preserved offline.');
      }
    } catch (error) {
      // Offline or network drop: items stay pending in IndexedDB safely
      console.warn('[SyncService] Sync attempt deferred (offline or server unreachable).');
    } finally {
      this.isSyncing = false;
    }

    return syncedCount;
  }

  /**
   * Pushes full IndexedDB state (profile, budget, categories, expenses, purchases) to Cloudflare D1.
   */
  async backupToCloud(): Promise<{ success: boolean; stats?: any; error?: string }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. An active Internet connection is required for Cloud backup.' };
    }

    try {
      const fullData = await this.idbService.exportAllData();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${environment.workerUrl}/api/backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.appSecretToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `Server error (${response.status}) during Cloud backup.` };
      }

      const result = await response.json();
      this.lastSyncedAt = new Date().toISOString();
      return { success: true, stats: result.stats };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to reach Cloudflare Worker server.' };
    }
  }

  /**
   * Fetches full state from Cloudflare D1 and restores IndexedDB.
   */
  async restoreFromCloud(): Promise<{ success: boolean; stats?: { expenses: number; purchases: number; categories: number }; error?: string }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are offline. An active Internet connection is required to restore from Cloud.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${environment.workerUrl}/api/restore`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${environment.appSecretToken}`
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `Server error (${response.status}) during Cloud restore.` };
      }

      const data = await response.json();
      const stats = await this.idbService.restoreAllData(data);
      this.lastSyncedAt = new Date().toISOString();

      return { success: true, stats };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to reach Cloudflare Worker server.' };
    }
  }
}
