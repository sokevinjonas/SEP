import { environment } from '../../../environments/environment';

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
      if (pendingItems.length === 0) {
        return 0;
      }

      // Group items for batch sync
      const payloadItems = pendingItems.map(item => ({
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
}
