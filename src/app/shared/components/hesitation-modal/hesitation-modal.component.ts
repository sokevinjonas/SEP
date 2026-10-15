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
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonChip,
  IonAvatar,
  ModalController,
  ToastController
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
import { DatabaseService } from '../../../core/db/database.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { BudgetCalculatorService } from '../../../core/services/budget-calculator.service';
import { Category, Expense, MonthlyBudget, Purchase, UserProfile } from '../../../core/models/financial.models';

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
  basisText = '(budget planifié)';
  budgetPercent = 0;
  concreteReframing = '';

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private db: DatabaseService,
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
    this.categories = await this.db.getCategories();
    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0];
    }
    this.userProfile = await this.db.getUserProfile();
    this.monthlyBudget = await this.db.getMonthlyBudget();
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
      this.showToast('Veuillez entrer le nom de l\'article ou de l\'envie.', 'warning');
      return;
    }

    if (this.amountNumber <= 0) {
      this.showToast('Veuillez entrer un montant supérieur à 0.', 'warning');
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
      this.concreteReframing = `Cela représente environ ${weeks} semaine(s) complète(s) de repas (${mealCount} repas campus).`;
    } else {
      this.concreteReframing = `Cela équivaut à ${mealCount} repas à la cafétéria du campus.`;
    }

    this.step = 'hesitation';
  }

  backToInput(): void {
    this.step = 'input';
  }

  dismiss(): void {
    this.modalCtrl.dismiss({ action: 'dismissed' });
  }

  // Option 1: "Je réfléchis" (Sauvegarde 48h sans dépenser) - Story 2.3
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

    await this.db.addPurchase(purchase);

    const toast = await this.toastCtrl.create({
      message: `Bravo ! ${purchase.amountGhs} GHS protégés. Cet achat est placé en pause réflexion 48h.`,
      duration: 3200,
      color: 'secondary',
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ action: 'delayed', purchase });
  }

  // Option 2: "Oui, j'achète quand même" (Story 2.3)
  async chooseToBuy(): Promise<void> {
    const now = new Date();

    // 1. Create immediate expense
    const expense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: this.amountNumber,
      currency: 'GHS',
      categoryId: this.selectedCategory ? this.selectedCategory.id : 'cat-other',
      categoryName: this.selectedCategory ? this.selectedCategory.name : 'Other',
      merchant: this.itemTitle.trim(),
      note: 'Achat validé après pause réflexion',
      date: now.toISOString(),
      source: 'manual',
      createdAt: now.toISOString()
    };
    await this.db.addExpense(expense);

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
    await this.db.addPurchase(purchase);

    const toast = await this.toastCtrl.create({
      message: `Dépense de ${expense.amount} GHS enregistrée. Aucun jugement, restons vigilants pour le reste du mois !`,
      duration: 2500,
      color: 'dark',
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ action: 'bought', expense, purchase });
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
