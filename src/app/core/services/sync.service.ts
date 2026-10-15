import { Injectable, inject } from '@angular/core';
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
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const queue = await this.syncQueueRepo.getAll();
    const pendingItems = queue.filter(item => item.status === 'pending');
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
      const pendingItems = queue.filter(item => item.status === 'pending');

      for (const item of pendingItems) {
        try {
          // Simulate streaming to Cloudflare Worker D1/R2 endpoint
          await this.syncItemToCloudflare(item);
          item.status = 'synced';
          await this.syncQueueRepo.update(item);
          syncedCount++;
        } catch (error) {
          item.status = 'failed';
          item.error = error instanceof Error ? error.message : 'Network drop';
          await this.syncQueueRepo.update(item);
          break; // Stop FIFO processing on network drop
        }
      }

      this.lastSyncedAt = new Date().toISOString();
    } finally {
      this.isSyncing = false;
    }

    return syncedCount;
  }

  private async syncItemToCloudflare(item: SyncItem): Promise<boolean> {
    // Artificial small delay for network roundtrip simulation
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }
}
