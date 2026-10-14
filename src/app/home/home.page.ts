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
import { CurrencyService } from '../core/services/currency.service';
import { BudgetCalculatorService, BudgetConsumption, BudgetDaysCalculation } from '../core/services/budget-calculator.service';
import { Expense, MonthlyBudget } from '../core/models/financial.models';
import { SettingsModalComponent } from '../shared/components/settings-modal/settings-modal.component';
import { CurrencyPillComponent } from '../shared/components/currency-pill/currency-pill.component';
import { BreathingBadgeComponent } from '../shared/components/breathing-badge/breathing-badge.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    CurrencyPillComponent,
    BreathingBadgeComponent
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  consumption: BudgetConsumption = {
    totalBudgetGhs: 600,
    totalSpentGhs: 0,
    balanceGhs: 600,
    consumedPercent: 0,
    status: 'safe'
  };

  budgetDaysInfo: BudgetDaysCalculation = {
    days: 30,
    basis: '(planned)',
    distinctDaysCount: 0,
    dailyBurnRateGhs: 20
  };

  avoidedGhs = 0;
  recentExpenses: Expense[] = [];
  monthlyBudget: MonthlyBudget | null = null;

  constructor(
    private db: DatabaseService,
    public currencyService: CurrencyService,
    private budgetCalculator: BudgetCalculatorService,
    private modalCtrl: ModalController
  ) {
    addIcons({
      optionsOutline,
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
    await this.currencyService.initFromDb();

    const allExpenses = await this.db.getExpenses();
    this.recentExpenses = allExpenses.slice(0, 5);

    const currentMonthKey = this.db.getCurrentMonthKey();
    const monthExpenses = allExpenses.filter(e => e.date.startsWith(currentMonthKey));
    const totalSpentGhs = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // SOLID: Delegate budget math to BudgetCalculatorService
    this.consumption = this.budgetCalculator.calculateConsumption(
      this.monthlyBudget.totalBudgetGhs,
      totalSpentGhs
    );

    // SOLID: Delegate budget days calculation (FR2)
    this.budgetDaysInfo = this.budgetCalculator.calculateBudgetDays(
      this.consumption.balanceGhs,
      monthExpenses,
      this.monthlyBudget.plannedDailyBudgetGhs
    );

    // Avoided Total (FR7)
    this.avoidedGhs = await this.db.getAvoidedTotal();
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
