import { Injectable, inject } from '@angular/core';
import { IdbService } from './idb.service';
import { SyncItem } from '../models/financial.models';

@Injectable({ providedIn: 'root' })
export class SyncQueueRepository {
  private readonly idb = inject(IdbService);

  async getAll(): Promise<SyncItem[]> {
    const db = await this.idb.db;
    return db.getAll('sync_queue');
  }

  async update(item: SyncItem): Promise<void> {
    const db = await this.idb.db;
    await db.put('sync_queue', item);
  }
}
