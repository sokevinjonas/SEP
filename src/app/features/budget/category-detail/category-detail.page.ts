import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonProgressBar,
  IonIcon,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonFab,
  IonFabButton,
  ModalController,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  createOutline,
  trashOutline,
  addOutline,
  receiptOutline,
  calendarOutline,
  walletOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  cashOutline,
  pricetagOutline
} from 'ionicons/icons';
import { BudgetFacade } from '../facade/budget.facade';
import { ExpensesFacade } from '../../expenses/facade/expenses.facade';
import { CurrencyService } from '../../../core/services/currency.service';
import { getCategoryIcon, getCategoryColor } from '../domain/budget.model';
import { Expense } from '../../../core/models/financial.models';
import { QuickLogModalComponent } from '../../../shared/components/quick-log-modal/quick-log-modal.component';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonProgressBar,
    IonIcon,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonFab,
    IonFabButton
  ],
  templateUrl: './category-detail.page.html',
  styleUrls: ['./category-detail.page.scss']
})
export class CategoryDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly budgetFacade = inject(BudgetFacade);
  public readonly expensesFacade = inject(ExpensesFacade);
  public readonly currencyService = inject(CurrencyService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  readonly categoryId = signal<string>('');

  readonly getCategoryIcon = getCategoryIcon;
  readonly getCategoryColor = getCategoryColor;

  readonly envelope = computed(() => {
    const id = this.categoryId();
    return this.budgetFacade.getEnvelopeByCategory(id);
  });

  readonly operations = computed<Expense[]>(() => {
    const id = this.categoryId();
    return this.expensesFacade.getExpensesByCategory(id);
  });

  readonly totalSpentGhs = computed(() => {
    return this.operations().reduce((sum, exp) => sum + exp.amount, 0);
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      createOutline,
      trashOutline,
      addOutline,
      receiptOutline,
      calendarOutline,
      walletOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      sparklesOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      cashOutline,
      pricetagOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.categoryId.set(id);
    }

    await Promise.all([
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.currencyService.initFromDb()
    ]);
  }

  async ionViewWillEnter(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== this.categoryId()) {
      this.categoryId.set(id);
    }
  }

  async openEditAllocation(): Promise<void> {
    const env = this.envelope();
    if (!env) return;

    const alert = await this.alertCtrl.create({
      header: `Adjust ${env.category.name}`,
      subHeader: `Current allocation: ${env.allocatedGhs} GHS`,
      inputs: [
        {
          name: 'allocation',
          type: 'number',
          placeholder: 'Monthly allocation in GHS',
          value: env.allocatedGhs,
          min: 0,
          max: 50000
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save Envelope',
          handler: async (data) => {
            const val = parseFloat(data.allocation);
            if (isNaN(val) || val < 0) {
              await this.showToast('Please enter a valid amount.', 'warning');
              return false;
            }
            await this.budgetFacade.updateCategoryAllocation(env.category.id, val);
            await this.showToast(`${env.category.name} envelope updated to ${val} GHS.`, 'success');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async openQuickLog(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: QuickLogModalComponent,
      componentProps: {
        preselectedCategoryId: this.categoryId()
      },
      cssClass: 'quick-log-modal'
    });
    await modal.present();
  }

  async confirmDeleteExpense(expense: Expense, slidingItem?: any): Promise<void> {
    if (slidingItem?.close) {
      slidingItem.close();
    }

    const alert = await this.alertCtrl.create({
      header: 'Delete Transaction?',
      message: `Do you want to delete "${expense.merchant || expense.categoryName}" (${expense.amount.toFixed(2)} ${expense.currency})?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.expensesFacade.deleteExpense(expense.id);
            await this.showToast('Transaction removed.', 'dark');
          }
        }
      ]
    });
    await alert.present();
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
