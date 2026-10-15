import { Injectable, inject } from '@angular/core';
import { PurchasesState } from '../state/purchases.state';
import { PurchasesRepository } from '../data-access/purchases.repository';
import { Purchase } from '../domain/purchase.model';

@Injectable({ providedIn: 'root' })
export class PurchasesFacade {
  private readonly state = inject(PurchasesState);
  private readonly repo = inject(PurchasesRepository);

  readonly purchases = this.state.purchases;
  readonly avoidedTotal = this.state.avoidedTotal;
  readonly pendingPurchases = this.state.pendingPurchases;
  readonly abandonedPurchases = this.state.abandonedPurchases;
  readonly boughtPurchases = this.state.boughtPurchases;
  readonly pendingCount = this.state.pendingCount;
  readonly abandonedCount = this.state.abandonedCount;
  readonly boughtCount = this.state.boughtCount;
  readonly loading = this.state.loading;
  readonly error = this.state.error;

  async load(): Promise<Purchase[]> {
    this.state.setLoading(true);
    this.state.setError(null);
    try {
      const [purchases, avoided] = await Promise.all([
        this.repo.getAll(),
        this.repo.getAvoidedTotal()
      ]);
      this.state.setPurchases(purchases);
      this.state.setAvoidedTotal(avoided);
      return purchases;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load purchases';
      this.state.setError(msg);
      return [];
    } finally {
      this.state.setLoading(false);
    }
  }

  async addPurchase(purchase: Purchase): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.add(purchase);
      this.state.append(purchase);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add purchase';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async updatePurchase(purchase: Purchase): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.update(purchase);
      this.state.update(purchase);
      const avoided = await this.repo.getAvoidedTotal();
      this.state.setAvoidedTotal(avoided);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update purchase';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async abandonPurchase(purchase: Purchase): Promise<void> {
    const updated: Purchase = {
      ...purchase,
      status: 'abandoned',
      resolvedAt: new Date().toISOString()
    };
    await this.updatePurchase(updated);
  }

  async buyPurchase(purchase: Purchase): Promise<void> {
    const updated: Purchase = {
      ...purchase,
      status: 'bought',
      resolvedAt: new Date().toISOString()
    };
    await this.updatePurchase(updated);
  }
}
