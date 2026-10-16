import { Injectable, inject } from '@angular/core';
import { IdbService } from '../../../core/db/idb.service';
import { Expense } from '../domain/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpensesRepository {
  private readonly idb = inject(IdbService);

  async getAll(): Promise<Expense[]> {
    const db = await this.idb.db;
    const all = await db.getAll('expenses');
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async checkDuplicateReference(ref: string): Promise<Expense | undefined> {
    if (!ref || !ref.trim()) return undefined;
    const all = await this.getAll();
    const clean = ref.trim().toLowerCase();
    return all.find(e => e.transactionRef && e.transactionRef.toLowerCase() === clean);
  }

  async add(expense: Expense): Promise<void> {
    const db = await this.idb.db;
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

  async delete(id: string): Promise<void> {
    const db = await this.idb.db;
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

  async update(expense: Expense): Promise<void> {
    const db = await this.idb.db;
    const tx = db.transaction(['expenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('expenses').put(expense);
    await tx.objectStore('sync_queue').put({
      id: `sync-upd-${expense.id}-${Date.now()}`,
      entity: 'expense',
      action: 'update',
      payload: expense,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await tx.done;
  }
}
