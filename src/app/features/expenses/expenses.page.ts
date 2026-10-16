import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonContent,
  IonSearchbar,
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
  receiptOutline,
  searchOutline,
  closeCircleOutline,
  trashOutline,
  addOutline,
  filterOutline,
  walletOutline,
  calendarOutline,
  chevronForwardOutline,
  timeOutline,
  swapHorizontalOutline,
  arrowBackOutline,
  sparklesOutline
} from 'ionicons/icons';
import { ExpensesFacade } from './facade/expenses.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { CurrencyService } from '../../core/services/currency.service';
import { Expense } from '../../core/models/financial.models';
import { ExpenseDetailModalComponent } from '../../shared/components/expense-detail-modal/expense-detail-modal.component';
import { QuickLogModalComponent } from '../../shared/components/quick-log-modal/quick-log-modal.component';

export interface ExpenseDateGroup {
  dateKey: string;
  displayDate: string;
  totalGhs: number;
  expenses: Expense[];
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon
  ],
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss']
})
export class ExpensesPage implements OnInit {
  readonly expensesFacade = inject(ExpensesFacade);
  readonly budgetFacade = inject(BudgetFacade);
  readonly currencyService = inject(CurrencyService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly router = inject(Router);

  readonly searchQuery = signal<string>('');
  readonly timeFilter = signal<'all' | 'today' | 'yesterday' | 'month'>('month');
  readonly selectedCategoryId = signal<string>('all');

  constructor() {
    addIcons({
      receiptOutline,
      searchOutline,
      closeCircleOutline,
      trashOutline,
      addOutline,
      filterOutline,
      walletOutline,
      calendarOutline,
      chevronForwardOutline,
      timeOutline,
      swapHorizontalOutline,
      arrowBackOutline,
      sparklesOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.expensesFacade.load();
    if (this.budgetFacade.categories().length === 0) {
      await this.budgetFacade.load();
    }
  }

  readonly categories = this.budgetFacade.categories;

  /**
   * Filtered list of expenses matching search query, time segment, and category envelope.
   */
  readonly filteredExpenses = computed<Expense[]>(() => {
    let list = this.expensesFacade.expenses();
    const query = this.searchQuery().trim().toLowerCase();
    const time = this.timeFilter();
    const catId = this.selectedCategoryId();

    // 1. Time Filter
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

    if (time === 'today') {
      list = list.filter(e => e.date.slice(0, 10) === todayStr);
    } else if (time === 'yesterday') {
      list = list.filter(e => e.date.slice(0, 10) === yesterdayStr);
    } else if (time === 'month') {
      list = list.filter(e => e.date.slice(0, 7) === currentMonthPrefix);
    }

    // 2. Category Filter
    if (catId !== 'all') {
      list = list.filter(e => e.categoryId === catId);
    }

    // 3. Search Query Filter
    if (query) {
      list = list.filter(e => {
        const merchant = (e.merchant || '').toLowerCase();
        const cat = (e.categoryName || '').toLowerCase();
        const note = (e.note || '').toLowerCase();
        const ref = (e.transactionRef || '').toLowerCase();
        const amountStr = e.amount.toString();
        return (
          merchant.includes(query) ||
          cat.includes(query) ||
          note.includes(query) ||
          ref.includes(query) ||
          amountStr.includes(query)
        );
      });
    }

    // Sort by chronological descent (latest first)
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  /**
   * Total spent for the current filter selection
   */
  readonly totalFilteredAmount = computed<number>(() => {
    return this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0);
  });

  /**
   * Expenses grouped by day for ledger timeline presentation
   */
  readonly groupedExpenses = computed<ExpenseDateGroup[]>(() => {
    const list = this.filteredExpenses();
    if (list.length === 0) return [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const groupsMap = new Map<string, Expense[]>();
    for (const exp of list) {
      const dayKey = exp.date.slice(0, 10);
      const arr = groupsMap.get(dayKey) || [];
      arr.push(exp);
      groupsMap.set(dayKey, arr);
    }

    const groups: ExpenseDateGroup[] = [];
    for (const [dayKey, items] of groupsMap.entries()) {
      let display = dayKey;
      if (dayKey === todayStr) {
        display = 'Today';
      } else if (dayKey === yesterdayStr) {
        display = 'Yesterday';
      } else {
        const d = new Date(dayKey + 'T12:00:00');
        display = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }

      const totalGhs = items.reduce((sum, item) => sum + item.amount, 0);
      groups.push({
        dateKey: dayKey,
        displayDate: display,
        totalGhs,
        expenses: items
      });
    }

    return groups;
  });

  setTimeFilter(filter: 'all' | 'today' | 'yesterday' | 'month'): void {
    this.timeFilter.set(filter);
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.timeFilter.set('month');
    this.selectedCategoryId.set('all');
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

  async openQuickLog(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: QuickLogModalComponent,
      componentProps: {
        preselectedCategoryId: this.selectedCategoryId() !== 'all' ? this.selectedCategoryId() : undefined
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
      header: 'Delete Expense?',
      message: `Delete "${expense.merchant || expense.categoryName}" (${expense.amount.toFixed(2)} ${expense.currency})?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.expensesFacade.deleteExpense(expense.id);
              const toast = await this.toastCtrl.create({
                message: 'Expense deleted successfully',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await toast.present();
            } catch {
              const errToast = await this.toastCtrl.create({
                message: 'Error deleting expense',
                duration: 3000,
                color: 'danger',
                position: 'top'
              });
              await errToast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
