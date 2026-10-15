import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonProgressBar,
  IonChip,
  IonBadge,
  IonAvatar,
  IonLabel,
  IonNote,
  IonList,
  IonListHeader,
  IonItem,
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
  ellipsisHorizontalCircleOutline,
  trophyOutline,
  chatbubblesOutline,
  sparklesOutline
} from 'ionicons/icons';
import { DatabaseService } from '../core/db/database.service';
import { CurrencyService } from '../core/services/currency.service';
import { BudgetCalculatorService, BudgetConsumption, BudgetDaysCalculation } from '../core/services/budget-calculator.service';
import { Expense, MonthlyBudget, UserProfile } from '../core/models/financial.models';
import { CurrencyPillComponent } from '../shared/components/currency-pill/currency-pill.component';
import { BreathingBadgeComponent } from '../shared/components/breathing-badge/breathing-badge.component';
import { PognonChatModalComponent } from '../shared/components/pognon-chat-modal/pognon-chat-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    IonProgressBar,
    IonChip,
    IonBadge,
    IonAvatar,
    IonLabel,
    IonNote,
    IonList,
    IonListHeader,
    IonItem,
    IonIcon,
    CurrencyPillComponent,
    BreathingBadgeComponent
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  userProfile: UserProfile | null = null;

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
    private router: Router,
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
      ellipsisHorizontalCircleOutline,
      trophyOutline,
      chatbubblesOutline,
      sparklesOutline
    });
  }

  isCelebratingAvoided = false;

  async openPognonChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PognonChatModalComponent,
      cssClass: 'pognon-chat-modal'
    });
    await modal.present();
  }

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async ionViewWillEnter() {
    await this.loadDashboardData();
    if (sessionStorage.getItem('sep_celebrate_avoided') === 'true') {
      sessionStorage.removeItem('sep_celebrate_avoided');
      this.isCelebratingAvoided = true;
      setTimeout(() => {
        this.isCelebratingAvoided = false;
      }, 4000);
    }
  }

  async loadDashboardData() {
    this.userProfile = await this.db.getUserProfile();
    this.monthlyBudget = await this.db.getMonthlyBudget();
    await this.currencyService.initFromDb();

    const allExpenses = await this.db.getExpenses();
    this.recentExpenses = allExpenses.slice(0, 5);

    const currentMonthKey = this.db.getCurrentMonthKey();
    const monthExpenses = allExpenses.filter(e => e.date.startsWith(currentMonthKey));
    const totalSpentGhs = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    this.consumption = this.budgetCalculator.calculateConsumption(
      this.monthlyBudget.totalBudgetGhs,
      totalSpentGhs
    );

    this.budgetDaysInfo = this.budgetCalculator.calculateBudgetDays(
      this.consumption.balanceGhs,
      monthExpenses,
      this.monthlyBudget.plannedDailyBudgetGhs
    );

    this.avoidedGhs = await this.db.getAvoidedTotal();
  }

  getCategoryIcon(iconName: string): string {
    return iconName || 'ellipsis-horizontal-circle-outline';
  }

  openSettings(): void {
    this.router.navigate(['/tabs/profile']);
  }
}
