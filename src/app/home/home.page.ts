import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonContent,
  IonProgressBar,
  IonChip,
  IonAvatar,
  IonLabel,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  ModalController,
  AlertController,
  ToastController
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
  sparklesOutline,
  trashOutline,
  calendarOutline,
  compassOutline,
  arrowForwardOutline,
  receiptOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { Expense } from '../core/models/financial.models';
import { ExpensesFacade } from '../features/expenses/facade/expenses.facade';
import { PurchasesFacade } from '../features/purchases/facade/purchases.facade';
import { BudgetFacade } from '../features/budget/facade/budget.facade';
import { ProfileFacade } from '../features/profile/facade/profile.facade';
import { CurrencyService } from '../core/services/currency.service';
import { CurrencyPillComponent } from '../shared/components/currency-pill/currency-pill.component';
import { BreathingBadgeComponent } from '../shared/components/breathing-badge/breathing-badge.component';
import { PognonChatModalComponent } from '../shared/components/pognon-chat-modal/pognon-chat-modal.component';
import { ExpenseDetailModalComponent } from '../shared/components/expense-detail-modal/expense-detail-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonContent,
    IonProgressBar,
    IonChip,
    IonAvatar,
    IonLabel,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    CurrencyPillComponent,
    BreathingBadgeComponent
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  // Reactive Signals from Facades - drive UI instantly without zone.js or clicks
  readonly userProfile = this.profileFacade.userProfile;
  readonly consumption = this.budgetFacade.consumption;
  readonly budgetDaysInfo = this.budgetFacade.budgetDaysInfo;
  readonly isDiscoveryMode = this.budgetFacade.isDiscoveryMode;
  readonly avoidedGhs = this.purchasesFacade.avoidedTotal;
  readonly recentExpenses = this.expensesFacade.recentExpenses;

  isCelebratingAvoided = false;

  constructor(
    public readonly expensesFacade: ExpensesFacade,
    public readonly purchasesFacade: PurchasesFacade,
    public readonly budgetFacade: BudgetFacade,
    public readonly profileFacade: ProfileFacade,
    public readonly currencyService: CurrencyService,
    private readonly router: Router,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController
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
      sparklesOutline,
      trashOutline,
      calendarOutline,
      compassOutline,
      arrowForwardOutline,
      receiptOutline,
      chevronForwardOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.refreshAllData();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.refreshAllData();

    if (sessionStorage.getItem('sep_celebrate_avoided') === 'true') {
      sessionStorage.removeItem('sep_celebrate_avoided');
      this.isCelebratingAvoided = true;
      setTimeout(() => {
        this.isCelebratingAvoided = false;
      }, 4000);
    }
  }

  async refreshAllData(): Promise<void> {
    await Promise.all([
      this.profileFacade.load(),
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.purchasesFacade.load(),
      this.currencyService.initFromDb()
    ]);
  }

  async openPognonChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PognonChatModalComponent,
      cssClass: 'pognon-chat-modal'
    });
    await modal.present();
  }

  async confirmDeleteExpense(expense: Expense, slidingItem?: any): Promise<void> {
    if (slidingItem?.close) {
      slidingItem.close();
    }
    const alert = await this.alertCtrl.create({
      header: 'Delete Expense?',
      message: `Do you want to delete "${expense.merchant || expense.categoryName}" (${expense.amount.toFixed(2)} ${expense.currency})?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.expensesFacade.deleteExpense(expense.id);
            const toast = await this.toastCtrl.create({
              message: 'Expense removed.',
              duration: 2000,
              color: 'dark',
              position: 'top'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  getCategoryIcon(iconName: string): string {
    return iconName || 'ellipsis-horizontal-circle-outline';
  }

  openSettings(): void {
    this.router.navigate(['/tabs/profile']);
  }

  navigateToExpenses(): void {
    this.router.navigate(['/tabs/expenses']);
  }

  navigateToBudgetSettings(): void {
    this.router.navigate(['/tabs/budget']);
  }

  async openExpenseDetail(expense: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseDetailModalComponent,
      componentProps: { expense },
      breakpoints: [0, 0.72, 0.95],
      initialBreakpoint: 0.72,
      handle: true,
      cssClass: 'expense-detail-modal'
    });
    await modal.present();
  }

  async openAiBudgetProposal(): Promise<void> {
    const totalSpent = this.consumption().totalSpentGhs;
    const daysElapsed = this.consumption().cycleDaysElapsed || 1;
    const daysTotal = this.consumption().cycleDaysTotal || 30;
    const cycleDay = this.consumption().cycleStartDay || 1;

    // Estimate realistic monthly target:
    // If user has tracked for at least a few days, project to 30 days and round to clean ceiling
    let suggestedBudget = 500;
    if (totalSpent > 0 && daysElapsed > 0) {
      const projected = (totalSpent / daysElapsed) * daysTotal;
      suggestedBudget = Math.max(100, Math.round(projected / 50) * 50);
    }

    const alert = await this.alertCtrl.create({
      header: 'M. Pognon AI Proposal',
      subHeader: `Observation: ${totalSpent.toFixed(2)} GHS tracked over ${daysElapsed} day(s)`,
      message: `Based on your real campus spending velocity, M. Pognon projects an optimal monthly allowance target of ${suggestedBudget} GHS (~${this.currencyService.toXof(suggestedBudget).toLocaleString()} XOF).\n\nWould you like to adopt this as your target monthly budget ceiling now?`,
      buttons: [
        {
          text: 'Continue in Discovery Mode',
          role: 'cancel'
        },
        {
          text: `Adopt ${suggestedBudget} GHS Budget`,
          handler: async () => {
            const currentBudget = this.budgetFacade.monthlyBudget();
            const updatedBudget = {
              id: currentBudget?.id || '2026-10',
              monthYear: currentBudget?.monthYear || '2026-10',
              totalBudgetGhs: suggestedBudget,
              exchangeRateXof: currentBudget?.exchangeRateXof || 42.0,
              plannedDailyBudgetGhs: Math.round(suggestedBudget / 30),
              isDiscoveryMode: false,
              cycleStartDay: cycleDay
            };
            await this.budgetFacade.saveMonthlyBudget(updatedBudget);

            const profile = this.userProfile();
            if (profile) {
              await this.profileFacade.saveUserProfile({
                ...profile,
                budgetMode: 'fixed',
                updatedAt: new Date().toISOString()
              });
            }

            const toast = await this.toastCtrl.create({
              message: `Personalized budget of ${suggestedBudget} GHS adopted! Breathing balance is now active.`,
              duration: 3000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }
}
