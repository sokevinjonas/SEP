import { Injectable, inject } from '@angular/core';
import { IdbService } from '../../../core/db/idb.service';
import { Purchase } from '../domain/purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchasesRepository {
  private readonly idb = inject(IdbService);

  async getAll(statusFilter?: 'pending' | 'bought' | 'abandoned'): Promise<Purchase[]> {
    const db = await this.idb.db;
    if (statusFilter) {
      return db.getAllFromIndex('purchases', 'by-status', statusFilter);
    }
    const all = await db.getAll('purchases');
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async add(purchase: Purchase): Promise<void> {
    const db = await this.idb.db;
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

  async update(purchase: Purchase): Promise<void> {
    const db = await this.idb.db;
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
    const db = await this.idb.db;
    const abandoned = await db.getAllFromIndex('purchases', 'by-status', 'abandoned');
    return abandoned.reduce((sum, p) => sum + p.amountGhs, 0);
  }
}
