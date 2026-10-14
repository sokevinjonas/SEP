import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonProgressBar,
  IonAvatar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonChip,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  timeOutline,
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../core/db/database.service';
import { CurrencyService } from '../../core/services/currency.service';
import { BudgetCalculatorService } from '../../core/services/budget-calculator.service';
import { Category, Purchase, Expense } from '../../core/models/financial.models';

export interface CategoryEnvelopeView {
  category: Category;
  spentGhs: number;
  allocatedGhs: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonProgressBar,
    IonAvatar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonIcon
  ],
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss']
})
export class BudgetPage implements OnInit {
  envelopes: CategoryEnvelopeView[] = [];
  pendingPurchases: Purchase[] = [];
  avoidedPurchases: Purchase[] = [];
  totalSpentGhs = 0;
  totalBudgetAllocatedGhs = 0;

  constructor(
    private db: DatabaseService,
    public currencyService: CurrencyService,
    public budgetCalculator: BudgetCalculatorService
  ) {
    addIcons({
      walletOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      timeOutline,
      checkmarkCircleOutline,
      shieldCheckmarkOutline,
      alertCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadBudgetData();
  }

  async ionViewWillEnter() {
    await this.loadBudgetData();
  }

  async loadBudgetData() {
    const categories = await this.db.getCategories();
    const allExpenses = await this.db.getExpenses();
    const currentMonthKey = this.db.getCurrentMonthKey();
    const monthExpenses = allExpenses.filter(e => e.date.startsWith(currentMonthKey));

    const spentByCategory = new Map<string, number>();
    for (const exp of monthExpenses) {
      const cur = spentByCategory.get(exp.categoryId) || 0;
      spentByCategory.set(exp.categoryId, cur + exp.amount);
    }

    this.totalSpentGhs = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    this.totalBudgetAllocatedGhs = categories.reduce((sum, c) => sum + (c.monthlyAllocationGhs || 0), 0);

    this.envelopes = categories.map(cat => {
      const allocated = cat.monthlyAllocationGhs || 50;
      const spent = spentByCategory.get(cat.id) || 0;
      const percentage = Math.min(100, Math.round((spent / allocated) * 100));

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentage >= 90) {
        status = 'danger';
      } else if (percentage >= 70) {
        status = 'warning';
      }

      return {
        category: cat,
        spentGhs: spent,
        allocatedGhs: allocated,
        percentage,
        status
      };
    });

    const purchases = await this.db.getPurchases();
    this.pendingPurchases = purchases.filter(p => p.status === 'pending');
    this.avoidedPurchases = purchases.filter(p => p.status === 'abandoned');
  }

  getHoursRemaining(expiresAt?: string): string {
    if (!expiresAt) return '48h';
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Expiré (décision)';
    const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return `${hours}h restantes`;
  }

  getCategoryIcon(catId: string): string {
    switch (catId) {
      case 'cat-food': return 'restaurant-outline';
      case 'cat-transport': return 'bus-outline';
      case 'cat-books': return 'book-outline';
      case 'cat-social': return 'people-outline';
      case 'cat-utilities': return 'flash-outline';
      default: return 'ellipsis-horizontal-circle-outline';
    }
  }
}
