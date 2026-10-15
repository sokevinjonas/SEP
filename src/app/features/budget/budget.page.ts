import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonCardContent,
  IonChip,
  IonIcon,
  IonButton,
  IonSegment,
  IonSegmentButton,
  ModalController,
  AlertController,
  ToastController
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
  alertCircleOutline,
  closeCircleOutline,
  cartOutline,
  trophyOutline,
  chatbubblesOutline
} from 'ionicons/icons';
import { BudgetFacade } from './facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { PurchasesFacade } from '../purchases/facade/purchases.facade';
import { CurrencyService } from '../../core/services/currency.service';
import { BudgetCalculatorService } from '../../core/services/budget-calculator.service';
import { Purchase, Expense } from '../../core/models/financial.models';
import { PognonChatModalComponent } from '../../shared/components/pognon-chat-modal/pognon-chat-modal.component';

export { CategoryEnvelopeView } from './domain/budget.model';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    IonIcon,
    IonButton,
    IonSegment,
    IonSegmentButton
  ],
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss']
})
export class BudgetPage implements OnInit {
  // Reactive Signals from Facades
  readonly envelopes = this.budgetFacade.envelopes;
  readonly totalSpentGhs = this.expensesFacade.currentMonthTotalSpent;
  readonly totalBudgetAllocatedGhs = this.budgetFacade.totalBudgetAllocatedGhs;
  readonly allPurchases = this.purchasesFacade.purchases;
  readonly totalAvoidedGhs = this.purchasesFacade.avoidedTotal;
  readonly pendingCount = this.purchasesFacade.pendingCount;
  readonly abandonedCount = this.purchasesFacade.abandonedCount;
  readonly boughtCount = this.purchasesFacade.boughtCount;

  readonly selectedFilter = signal<'all' | 'pending' | 'abandoned' | 'bought'>('all');

  readonly filteredPurchases = computed(() => {
    const filter = this.selectedFilter();
    const list = this.allPurchases();
    if (filter === 'all') return list;
    return list.filter(p => p.status === filter);
  });

  constructor(
    public readonly budgetFacade: BudgetFacade,
    public readonly expensesFacade: ExpensesFacade,
    public readonly purchasesFacade: PurchasesFacade,
    public readonly currencyService: CurrencyService,
    public readonly budgetCalculator: BudgetCalculatorService,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController
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
      alertCircleOutline,
      closeCircleOutline,
      cartOutline,
      trophyOutline,
      chatbubblesOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    await Promise.all([
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.purchasesFacade.load(),
      this.currencyService.initFromDb()
    ]);
  }

  onSegmentChange(value: any): void {
    if (value) {
      this.selectedFilter.set(value);
    }
  }

  async openPognonChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PognonChatModalComponent,
      cssClass: 'pognon-chat-modal'
    });
    await modal.present();
  }

  getHoursRemaining(expiresAt?: string): string {
    if (!expiresAt) return '48h';
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Ready to decide';
    const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return `${hours}h left`;
  }

  // Story 2.4 & 2.5: Abandon considered purchase -> Victory
  async abandonPurchase(pur: Purchase): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Resist this purchase?',
      message: `By letting go of "${pur.title}", you save ${pur.amountGhs} GHS which will be added to your Avoided Total!`,
      buttons: [
        { text: 'Keep thinking', role: 'cancel' },
        {
          text: 'Victory! I resist',
          handler: async () => {
            await this.purchasesFacade.abandonPurchase(pur);

            // Flag for celebratory trophy animation on home tab
            sessionStorage.setItem('sep_celebrate_avoided', 'true');

            const toast = await this.toastCtrl.create({
              message: `Financial victory! +${pur.amountGhs} GHS added to your Avoided Total.`,
              duration: 3000,
              color: 'secondary',
              position: 'top'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  // Story 2.5: Buy anyway
  async buyPurchase(pur: Purchase): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Confirm this purchase?',
      message: `Do you want to permanently log an expense of ${pur.amountGhs} GHS for "${pur.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Yes, log expense',
          handler: async () => {
            const now = new Date();

            // 1. Mark purchase as bought in state + IDB
            await this.purchasesFacade.buyPurchase(pur);

            // 2. Create actual expense in state + IDB
            const expense: Expense = {
              id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              amount: pur.amountGhs,
              currency: 'GHS',
              categoryId: 'cat-other',
              categoryName: 'Considered Purchases',
              merchant: pur.title,
              note: 'Confirmed after cooling-off period',
              date: now.toISOString(),
              source: 'manual',
              createdAt: now.toISOString()
            };
            await this.expensesFacade.addExpense(expense);

            const toast = await this.toastCtrl.create({
              message: `Expense of ${pur.amountGhs} GHS recorded in your ledger.`,
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
