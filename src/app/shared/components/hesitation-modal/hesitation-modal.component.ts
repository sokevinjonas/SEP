import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonBadge,
  ModalController,
  ToastController,
  IonChip,
  IonAvatar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  flameOutline,
  walletOutline,
  timeOutline,
  shieldCheckmarkOutline,
  checkmarkOutline,
  refreshOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  alertCircleOutline,
  arrowForwardOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { ExpensesFacade } from '../../../features/expenses/facade/expenses.facade';
import { PurchasesFacade } from '../../../features/purchases/facade/purchases.facade';
import { BudgetFacade } from '../../../features/budget/facade/budget.facade';
import { ProfileFacade } from '../../../features/profile/facade/profile.facade';
import { CurrencyService } from '../../../core/services/currency.service';
import { BudgetCalculatorService } from '../../../core/services/budget-calculator.service';
import { Category, Purchase, Expense, UserProfile, MonthlyBudget } from '../../../core/models/financial.models';

@Component({
  selector: 'app-hesitation-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon,
    IonChip,
    IonAvatar
  ],
  templateUrl: './hesitation-modal.component.html',
  styleUrls: ['./hesitation-modal.component.scss']
})
export class HesitationModalComponent implements OnInit {
  readonly Math = Math;

  step: 'input' | 'hesitation' = 'input';

  itemTitle = '';
  amountStr = '';
  categories: Category[] = [];
  selectedCategory: Category | null = null;

  userProfile: UserProfile | null = null;
  monthlyBudget: MonthlyBudget | null = null;

  // Computed Hesitation metrics
  computedCostDays = 0;
  basisText = '(planned budget)';
  budgetPercent = 0;
  concreteReframing = '';

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private expensesFacade: ExpensesFacade,
    private purchasesFacade: PurchasesFacade,
    private budgetFacade: BudgetFacade,
    private profileFacade: ProfileFacade,
    public currencyService: CurrencyService,
    private budgetCalculator: BudgetCalculatorService
  ) {
    addIcons({
      closeOutline,
      flameOutline,
      walletOutline,
      timeOutline,
      shieldCheckmarkOutline,
      checkmarkOutline,
      refreshOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      alertCircleOutline,
      arrowForwardOutline,
      arrowBackOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.budgetFacade.load(),
      this.profileFacade.load()
    ]);
    this.categories = this.budgetFacade.categories();
    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0];
    }
    this.userProfile = this.profileFacade.userProfile();
    this.monthlyBudget = this.budgetFacade.monthlyBudget();
  }

  get amountNumber(): number {
    return parseFloat(this.amountStr) || 0;
  }

  get amountSecondary(): number {
    return this.currencyService.toXof(this.amountNumber);
  }

  selectCategory(cat: Category): void {
    this.selectedCategory = cat;
  }

  proceedToHesitation(): void {
    if (!this.itemTitle.trim()) {
      this.showToast('Please enter the item name or desire.', 'warning');
      return;
    }

    if (this.amountNumber <= 0) {
      this.showToast('Please enter an amount greater than 0.', 'warning');
      return;
    }

    const dailyBudget = this.monthlyBudget?.plannedDailyBudgetGhs || 20;
    const totalBudget = this.monthlyBudget?.totalBudgetGhs || 600;

    // Days shock calculation
    this.computedCostDays = Math.max(1, Math.round(this.amountNumber / dailyBudget));
    this.budgetPercent = Math.min(100, Math.round((this.amountNumber / totalBudget) * 100));

    // Reframing calculation (in meals: avg 15 GHS per meal)
    const mealCount = Math.max(1, Math.round(this.amountNumber / 15));
    if (this.computedCostDays >= 7) {
      const weeks = Math.round(this.computedCostDays / 7);
      this.concreteReframing = `That represents about ${weeks} full week(s) of food (${mealCount} campus meals).`;
    } else {
      this.concreteReframing = `That equals ${mealCount} meals at the campus cafeteria.`;
    }

    this.step = 'hesitation';
  }

  backToInput(): void {
    this.step = 'input';
  }

  dismiss(): void {
    this.modalCtrl.dismiss({ action: 'dismissed' });
  }

  // Option 1: "I'll think about it" (48h cooling-off pause without spending) - Story 2.3
  async chooseToThink(): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

    const purchase: Purchase = {
      id: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: this.itemTitle.trim(),
      amountGhs: this.amountNumber,
      costInBudgetDays: this.computedCostDays,
      reframingText: this.concreteReframing,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt
    };

    // Reflects in PurchasesState signal immediately
    await this.purchasesFacade.addPurchase(purchase);

    const toast = await this.toastCtrl.create({
      message: `Well done! ${purchase.amountGhs} GHS protected. Placed in 48h cooling-off pause.`,
      duration: 3200,
      color: 'secondary',
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ action: 'delayed', purchase, saved: true });
  }

  // Option 2: "Yes, I'll buy it anyway" (Story 2.3)
  async chooseToBuy(): Promise<void> {
    const now = new Date();

    // 1. Create immediate expense (reflects in ExpensesState signal immediately)
    const expense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: this.amountNumber,
      currency: 'GHS',
      categoryId: this.selectedCategory ? this.selectedCategory.id : 'cat-other',
      categoryName: this.selectedCategory ? this.selectedCategory.name : 'Other',
      merchant: this.itemTitle.trim(),
      note: 'Bought after hesitation review',
      date: now.toISOString(),
      source: 'manual',
      createdAt: now.toISOString()
    };
    await this.expensesFacade.addExpense(expense);

    // 2. Track in purchases as bought
    const purchase: Purchase = {
      id: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: this.itemTitle.trim(),
      amountGhs: this.amountNumber,
      costInBudgetDays: this.computedCostDays,
      reframingText: this.concreteReframing,
      status: 'bought',
      createdAt: now.toISOString(),
      expiresAt: now.toISOString(),
      resolvedAt: now.toISOString()
    };
    await this.purchasesFacade.addPurchase(purchase);

    const toast = await this.toastCtrl.create({
      message: `Expense of ${expense.amount} GHS recorded. No judgment, stay on track for the month!`,
      duration: 2500,
      color: 'dark',
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ action: 'bought', expense, purchase, saved: true });
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
