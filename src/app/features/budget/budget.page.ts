import { Component, OnInit } from '@angular/core';
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
import { DatabaseService } from '../../core/db/database.service';
import { CurrencyService } from '../../core/services/currency.service';
import { BudgetCalculatorService } from '../../core/services/budget-calculator.service';
import { Category, Purchase, Expense } from '../../core/models/financial.models';
import { PognonChatModalComponent } from '../../shared/components/pognon-chat-modal/pognon-chat-modal.component';

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
  envelopes: CategoryEnvelopeView[] = [];

  allPurchases: Purchase[] = [];
  selectedFilter: 'all' | 'pending' | 'abandoned' | 'bought' = 'all';

  totalSpentGhs = 0;
  totalBudgetAllocatedGhs = 0;
  totalAvoidedGhs = 0;

  constructor(
    private db: DatabaseService,
    public currencyService: CurrencyService,
    public budgetCalculator: BudgetCalculatorService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
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

  async openPognonChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PognonChatModalComponent,
      cssClass: 'pognon-chat-modal'
    });
    await modal.present();
  }

  async ngOnInit(): Promise<void> {
    await this.loadBudgetData();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadBudgetData();
  }

  async loadBudgetData(): Promise<void> {
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

    this.allPurchases = await this.db.getPurchases();
    this.totalAvoidedGhs = await this.db.getAvoidedTotal();
  }

  get filteredPurchases(): Purchase[] {
    if (this.selectedFilter === 'all') {
      return this.allPurchases;
    }
    return this.allPurchases.filter(p => p.status === this.selectedFilter);
  }

  get pendingCount(): number {
    return this.allPurchases.filter(p => p.status === 'pending').length;
  }

  get abandonedCount(): number {
    return this.allPurchases.filter(p => p.status === 'abandoned').length;
  }

  get boughtCount(): number {
    return this.allPurchases.filter(p => p.status === 'bought').length;
  }

  getHoursRemaining(expiresAt?: string): string {
    if (!expiresAt) return '48h';
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Prêt à décider';
    const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return `${hours}h restantes`;
  }

  // Story 2.4 & 2.5: Abandonner l'achat envisagé -> Victoire de discipline
  async abandonPurchase(pur: Purchase): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Renoncer à cet achat ?',
      message: `En renonçant à « ${pur.title} », vous protégez ${pur.amountGhs} GHS qui viendront grossir votre Total Épargné !`,
      buttons: [
        { text: 'Garder en réflexion', role: 'cancel' },
        {
          text: 'Victoire ! J\'abandonne',
          handler: async () => {
            pur.status = 'abandoned';
            pur.resolvedAt = new Date().toISOString();
            await this.db.updatePurchase(pur);
            await this.loadBudgetData();

            // Set flag for celebratory confetti on home tab
            sessionStorage.setItem('sep_celebrate_avoided', 'true');

            const toast = await this.toastCtrl.create({
              message: `Victoire financière ! +${pur.amountGhs} GHS ajoutés à votre Total Épargné.`,
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

  // Story 2.5: Acheter finalement
  async buyPurchase(pur: Purchase): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Valider cet achat ?',
      message: `Voulez-vous enregistrer définitivement la dépense de ${pur.amountGhs} GHS pour « ${pur.title} » ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Oui, enregistrer l\'achat',
          handler: async () => {
            const now = new Date();

            // 1. Mark purchase as bought
            pur.status = 'bought';
            pur.resolvedAt = now.toISOString();
            await this.db.updatePurchase(pur);

            // 2. Create actual expense in db
            const expense: Expense = {
              id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              amount: pur.amountGhs,
              currency: 'GHS',
              categoryId: 'cat-other',
              categoryName: 'Achats Évalués',
              merchant: pur.title,
              note: 'Validé après période de réflexion',
              date: now.toISOString(),
              source: 'manual',
              createdAt: now.toISOString()
            };
            await this.db.addExpense(expense);

            await this.loadBudgetData();

            const toast = await this.toastCtrl.create({
              message: `Achat de ${pur.amountGhs} GHS enregistré dans vos dépenses.`,
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
