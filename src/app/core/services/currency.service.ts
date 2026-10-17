import { Injectable, signal, computed, inject } from '@angular/core';
import { ProfileRepository } from '../../features/profile/data-access/profile.repository';
import { BudgetRepository } from '../../features/budget/data-access/budget.repository';

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
  private readonly profileRepo = inject(ProfileRepository);
  private readonly budgetRepo = inject(BudgetRepository);

  // Reactive Signals for active currency and exchange rate (1 GHS = X XOF)
  readonly activeCurrency = signal<CurrencyCode>('GHS');
  readonly secondaryCurrency = signal<CurrencyCode>('XOF');
  readonly exchangeRate = signal<number>(42);

  // Computed rate description: "1 GHS = 42 XOF"
  readonly rateDescription = computed(
    () => `1 ${this.activeCurrency()} = ${this.exchangeRate()} ${this.secondaryCurrency()}`
  );

  constructor() {
    this.initFromDb();
  }

  async initFromDb(): Promise<void> {
    const profile = await this.profileRepo.getUserProfile();
    if (profile && profile.primaryCurrency) {
      this.activeCurrency.set(profile.primaryCurrency);
    }

    const budget = await this.budgetRepo.getMonthlyBudget();
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
    const profile = await this.profileRepo.getUserProfile();
    if (profile) {
      profile.primaryCurrency = currency as any;
      await this.profileRepo.saveUserProfile(profile);
    }
  }

  async setSecondaryCurrency(currency: CurrencyCode): Promise<void> {
    this.secondaryCurrency.set(currency);
  }

  async setExchangeRate(newRate: number): Promise<void> {
    if (newRate <= 0) return;
    this.exchangeRate.set(newRate);
    const budget = await this.budgetRepo.getMonthlyBudget();
    if (budget) {
      budget.exchangeRateXof = newRate;
      await this.budgetRepo.saveMonthlyBudget(budget);
    }
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
