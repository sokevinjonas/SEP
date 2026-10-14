import { Injectable, signal, computed } from '@angular/core';
import { DatabaseService } from '../db/database.service';

export type CurrencyCode = 'GHS' | 'XOF';

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  // Reactive Signals for active currency and exchange rate (1 GHS = X XOF)
  readonly activeCurrency = signal<CurrencyCode>('GHS');
  readonly exchangeRate = signal<number>(42);

  // Computed rate description: "1 GHS = 42 XOF"
  readonly rateDescription = computed(() => `1 GHS = ${this.exchangeRate()} XOF`);

  constructor(private db: DatabaseService) {
    this.initFromDb();
  }

  async initFromDb(): Promise<void> {
    const budget = await this.db.getMonthlyBudget();
    if (budget && budget.exchangeRateXof) {
      this.exchangeRate.set(budget.exchangeRateXof);
    }
  }

  toggleCurrency(): void {
    this.activeCurrency.update(curr => (curr === 'GHS' ? 'XOF' : 'GHS'));
  }

  setCurrency(currency: CurrencyCode): void {
    this.activeCurrency.set(currency);
  }

  async setExchangeRate(newRate: number): Promise<void> {
    if (newRate <= 0) return;
    this.exchangeRate.set(newRate);
    const budget = await this.db.getMonthlyBudget();
    budget.exchangeRateXof = newRate;
    await this.db.saveMonthlyBudget(budget);
  }

  toXof(amountGhs: number): number {
    return Math.round(amountGhs * this.exchangeRate());
  }

  toGhs(amountXof: number): number {
    const rate = this.exchangeRate();
    return rate > 0 ? parseFloat((amountXof / rate).toFixed(2)) : 0;
  }

  convertFromGhs(amountGhs: number): number {
    return this.activeCurrency() === 'GHS' ? amountGhs : this.toXof(amountGhs);
  }

  get currencySymbol(): string {
    return this.activeCurrency();
  }

  formatAmount(amountGhs: number): string {
    if (this.activeCurrency() === 'GHS') {
      return `${amountGhs.toFixed(2)} GHS`;
    }
    return `${this.toXof(amountGhs).toLocaleString()} XOF`;
  }

  formatEquiv(amountGhs: number): string {
    if (this.activeCurrency() === 'GHS') {
      return `≈ ${this.toXof(amountGhs).toLocaleString()} XOF`;
    }
    return `≈ ${amountGhs.toFixed(2)} GHS`;
  }
}
