import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  flashOutline,
  trophyOutline,
  shieldCheckmarkOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  trashOutline,
  cartOutline,
  sparklesOutline,
  walletOutline,
  trendingUpOutline,
  alertCircleOutline,
  receiptOutline
} from 'ionicons/icons';
import { PurchasesFacade } from './facade/purchases.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { ProfileFacade } from '../profile/facade/profile.facade';
import { CurrencyService } from '../../core/services/currency.service';
import { Purchase, Expense } from '../../core/models/financial.models';
import { generateUuidV7 } from '../../core/utils/uuid';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel
  ],
  templateUrl: './purchases.page.html',
  styleUrls: ['./purchases.page.scss']
})
export class PurchasesPage implements OnInit {
  readonly purchasesFacade = inject(PurchasesFacade);
  readonly expensesFacade = inject(ExpensesFacade);
  readonly budgetFacade = inject(BudgetFacade);
  readonly profileFacade = inject(ProfileFacade);
  readonly currencyService = inject(CurrencyService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  readonly activeSegment = signal<'pending' | 'abandoned' | 'bought'>('pending');
  readonly isCelebrating = signal(false);

  get studentName(): string {
    return this.profileFacade.userProfile()?.name || 'Student';
  }

  constructor() {
    addIcons({
      arrowBackOutline,
      flashOutline,
      trophyOutline,
      shieldCheckmarkOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      trashOutline,
      cartOutline,
      sparklesOutline,
      walletOutline,
      trendingUpOutline,
      alertCircleOutline,
      receiptOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.purchasesFacade.load(),
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.profileFacade.load()
    ]);
  }

  get displayedPurchases(): Purchase[] {
    const segment = this.activeSegment();
    if (segment === 'pending') {
      return this.purchasesFacade.pendingPurchases();
    } else if (segment === 'abandoned') {
      return this.purchasesFacade.abandonedPurchases();
    } else {
      return this.purchasesFacade.boughtPurchases();
    }
  }

  setSegment(segment: 'pending' | 'abandoned' | 'bought'): void {
    this.activeSegment.set(segment);
  }

  /**
   * Jonas confirms he won the mental battle and abandons the impulse buy!
   * Increases Avoided Total and rewards him with confetti & praise.
   */
  async confirmAbandon(purchase: Purchase): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Victory over Impulse!',
      subHeader: `Abandon ${purchase.title}?`,
      message: `By letting this go, you save ${purchase.amountGhs} GHS (${purchase.costInBudgetDays.toFixed(1)} days of budget). This amount will be added to your Total Saved card!`,
      buttons: [
        {
          text: 'Still thinking',
          role: 'cancel'
        },
        {
          text: "Yes, I won't buy it!",
          role: 'destructive',
          handler: async () => {
            await this.purchasesFacade.abandonPurchase(purchase);
            this.triggerCelebration();

            const toast = await this.toastCtrl.create({
              message: `Excellent choice ${this.studentName}! +${purchase.amountGhs} GHS added to your Anti-Impulse Total!`,
              duration: 3500,
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

  /**
   * Jonas gave it thought and still genuinely needs/wants it.
   * Converts the purchase into an actual Expense and marks purchase as 'bought'.
   */
  async confirmBuy(purchase: Purchase): Promise<void> {
    const categories = this.budgetFacade.categories();
    const categoryInputs = categories.map((cat, index) => ({
      name: 'categoryRadio',
      type: 'radio' as const,
      label: `${cat.name} (${cat.monthlyAllocationGhs} GHS cap)`,
      value: cat.id,
      checked: index === 0
    }));

    const alert = await this.alertCtrl.create({
      header: 'Ready to Buy?',
      subHeader: `${purchase.title} (${purchase.amountGhs} GHS)`,
      message: 'Select the budget envelope for this expense:',
      inputs: categoryInputs,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm Purchase',
          handler: async (selectedCategoryId: string) => {
            const chosenCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
            const now = new Date();

            // 1. Create immediate expense
            const expense: Expense = {
              id: generateUuidV7(),
              amount: purchase.amountGhs,
              currency: 'GHS',
              categoryId: chosenCategory ? chosenCategory.id : 'cat-other',
              categoryName: chosenCategory ? chosenCategory.name : 'Other',
              merchant: purchase.title,
              note: `Bought after consideration (${purchase.costInBudgetDays.toFixed(1)} budget days)`,
              date: now.toISOString(),
              source: 'manual',
              createdAt: now.toISOString()
            };

            await this.expensesFacade.addExpense(expense);
            await this.purchasesFacade.buyPurchase(purchase);

            const toast = await this.toastCtrl.create({
              message: `Expense of ${purchase.amountGhs} GHS recorded in ${expense.categoryName}.`,
              duration: 2500,
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

  getTimeElapsed(dateIso: string): string {
    const diffMs = Date.now() - new Date(dateIso).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  private triggerCelebration(): void {
    this.isCelebrating.set(true);
    setTimeout(() => {
      this.isCelebrating.set(false);
    }, 4000);
  }

  goBack(): void {
    this.router.navigate(['/tabs/home']);
  }
}
