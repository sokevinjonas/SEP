import { Injectable, signal, computed } from '@angular/core';
import { Purchase } from '../domain/purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchasesState {
  private readonly _purchases = signal<Purchase[]>([]);
  private readonly _avoidedTotal = signal<number>(0);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly purchases = this._purchases.asReadonly();
  readonly avoidedTotal = this._avoidedTotal.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly pendingPurchases = computed(() =>
    this._purchases().filter(p => p.status === 'pending')
  );

  readonly abandonedPurchases = computed(() =>
    this._purchases().filter(p => p.status === 'abandoned')
  );

  readonly boughtPurchases = computed(() =>
    this._purchases().filter(p => p.status === 'bought')
  );

  readonly pendingCount = computed(() => this.pendingPurchases().length);
  readonly abandonedCount = computed(() => this.abandonedPurchases().length);
  readonly boughtCount = computed(() => this.boughtPurchases().length);

  setPurchases(data: Purchase[]): void {
    this._purchases.set(data);
  }

  setAvoidedTotal(total: number): void {
    this._avoidedTotal.set(total);
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  setError(msg: string | null): void {
    this._error.set(msg);
  }

  append(purchase: Purchase): void {
    this._purchases.update(list => [purchase, ...list]);
  }

  update(purchase: Purchase): void {
    this._purchases.update(list =>
      list.map(p => (p.id === purchase.id ? purchase : p))
    );
  }
}
