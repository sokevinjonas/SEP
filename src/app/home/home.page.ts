import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonIcon,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  optionsOutline,
  swapHorizontalOutline,
  shieldCheckmarkOutline,
  timeOutline,
  busOutline,
  restaurantOutline,
  bookOutline,
  trendingUpOutline,
  walletOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../core/db/database.service';
import { Expense, MonthlyBudget } from '../core/models/financial.models';
import { SettingsModalComponent } from '../shared/components/settings-modal/settings-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  currency: 'GHS' | 'XOF' = 'GHS';
  balanceGhs = 0;
  totalBudgetGhs = 600;
  totalSpentGhs = 0;
  consumedPercent = 0;
  avoidedGhs = 0;
  exchangeRate = 42;

  budgetDays = 0;
  budgetDaysBasis: '(planned)' | '(average)' = '(planned)';
  distinctDaysCount = 0;

  recentExpenses: Expense[] = [];
  monthlyBudget: MonthlyBudget | null = null;

  constructor(
    private db: DatabaseService,
    private modalCtrl: ModalController
  ) {
    addIcons({
      optionsOutline,
      swapHorizontalOutline,
      shieldCheckmarkOutline,
      timeOutline,
      busOutline,
      restaurantOutline,
      bookOutline,
      trendingUpOutline,
      walletOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async ionViewWillEnter() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.monthlyBudget = await this.db.getMonthlyBudget();
    this.exchangeRate = this.monthlyBudget.exchangeRateXof || 42;
    this.totalBudgetGhs = this.monthlyBudget.totalBudgetGhs;

    const allExpenses = await this.db.getExpenses();
    this.recentExpenses = allExpenses.slice(0, 5);

    const currentMonthKey = this.db.getCurrentMonthKey();
    const monthExpenses = allExpenses.filter(e => e.date.startsWith(currentMonthKey));

    this.totalSpentGhs = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    this.balanceGhs = Math.max(0, this.totalBudgetGhs - this.totalSpentGhs);
    this.consumedPercent = Math.min(100, Math.round((this.totalSpentGhs / this.totalBudgetGhs) * 100));

    // Calculate Budget Days (FR2)
    const distinctDaysSet = new Set(monthExpenses.map(e => e.date.substring(0, 10)));
    this.distinctDaysCount = distinctDaysSet.size;

    if (this.distinctDaysCount < 7) {
      const plannedDaily = this.monthlyBudget.plannedDailyBudgetGhs || 20;
      this.budgetDays = Math.round(this.balanceGhs / plannedDaily);
      this.budgetDaysBasis = '(planned)';
    } else {
      const dailyAverage = this.totalSpentGhs / this.distinctDaysCount;
      this.budgetDays = dailyAverage > 0 ? Math.round(this.balanceGhs / dailyAverage) : 30;
      this.budgetDaysBasis = '(average)';
    }

    // Avoided Total (FR7)
    this.avoidedGhs = await this.db.getAvoidedTotal();
  }

  toggleCurrency() {
    this.currency = this.currency === 'GHS' ? 'XOF' : 'GHS';
  }

  get displayedBalance(): string {
    if (this.currency === 'GHS') {
      return this.balanceGhs.toFixed(2);
    }
    return (this.balanceGhs * this.exchangeRate).toLocaleString();
  }

  get displayedEquiv(): string {
    if (this.currency === 'GHS') {
      return `≈ ${(this.balanceGhs * this.exchangeRate).toLocaleString()} XOF`;
    }
    return `≈ ${this.balanceGhs.toFixed(2)} GHS`;
  }

  getCategoryIcon(iconName: string): string {
    return iconName || 'ellipsis-horizontal-circle-outline';
  }

  async openSettings() {
    const modal = await this.modalCtrl.create({
      component: SettingsModalComponent,
      breakpoints: [0, 0.95, 1],
      initialBreakpoint: 0.95
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      await this.loadDashboardData();
    }
  }
}
