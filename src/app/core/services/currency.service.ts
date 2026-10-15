import { Injectable, signal, computed } from '@angular/core';
import { DatabaseService } from '../db/database.service';

export type CurrencyCode = 'GHS' | 'XOF' | 'USD' | 'EUR' | 'NGN' | string;

export interface LiveRateInfo {
  base: string;
  target: string;
  rate: number;
  lastUpdated: string;
  provider: string;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  // Reactive Signals for active currency and exchange rate (1 GHS = X XOF)
  readonly activeCurrency = signal<CurrencyCode>('GHS');
  readonly secondaryCurrency = signal<CurrencyCode>('XOF');
  readonly exchangeRate = signal<number>(42);

  // Computed rate description: "1 GHS = 42 XOF"
  readonly rateDescription = computed(
    () => `1 ${this.activeCurrency() === 'GHS' ? 'GHS' : 'GHS'} = ${this.exchangeRate()} ${this.secondaryCurrency()}`
  );

  constructor(private db: DatabaseService) {
    this.initFromDb();
  }

  async initFromDb(): Promise<void> {
    const profile = await this.db.getUserProfile();
    if (profile && profile.primaryCurrency) {
      this.activeCurrency.set(profile.primaryCurrency);
    }

    const budget = await this.db.getMonthlyBudget();
    if (budget && budget.exchangeRateXof) {
      this.exchangeRate.set(budget.exchangeRateXof);
    }
  }

  /**
   * Fetches the real-time exchange rate from an external open exchange API.
   * Gracefully handles timeouts and offline states.
   */
  async fetchLiveRate(base: string = 'GHS', target: string = 'XOF'): Promise<LiveRateInfo | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.result === 'success' && data.rates && data.rates[target] !== undefined) {
        const rawRate = data.rates[target];
        const rate = typeof rawRate === 'number' ? parseFloat(rawRate.toFixed(2)) : parseFloat(rawRate);
        return {
          base,
          target,
          rate,
          lastUpdated: data.time_last_update_utc || new Date().toUTCString(),
          provider: 'Open Exchange Rates (er-api)'
        };
      }
      return null;
    } catch (error) {
      console.warn('CurrencyService: Offline or live rate fetch unavailable, relying on stored rate.', error);
      return null;
    }
  }

  toggleCurrency(): void {
    this.activeCurrency.update(curr => (curr === 'GHS' ? 'XOF' : 'GHS'));
  }

  async setCurrency(currency: CurrencyCode): Promise<void> {
    this.activeCurrency.set(currency);
    const profile = await this.db.getUserProfile();
    if (profile) {
      profile.primaryCurrency = currency as any;
      await this.db.saveUserProfile(profile);
    }
  }

  async setSecondaryCurrency(currency: CurrencyCode): Promise<void> {
    this.secondaryCurrency.set(currency);
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
