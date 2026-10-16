import { Component, OnInit, Input } from '@angular/core';
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
  IonCardContent,
  IonChip,
  IonInput,
  IonLabel,
  IonIcon,
  ModalController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  refreshOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  checkmarkOutline,
  backspaceOutline,
  calendarOutline
} from 'ionicons/icons';
import { ExpensesFacade } from '../../../features/expenses/facade/expenses.facade';
import { BudgetFacade } from '../../../features/budget/facade/budget.facade';
import { CurrencyService } from '../../../core/services/currency.service';
import { Category, Expense } from '../../../core/models/financial.models';

@Component({
  selector: 'app-quick-log-modal',
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
    IonCard,
    IonCardContent,
    IonChip,
    IonInput,
    IonLabel,
    IonIcon
  ],
  templateUrl: './quick-log-modal.component.html',
  styleUrls: ['./quick-log-modal.component.scss']
})
export class QuickLogModalComponent implements OnInit {
  @Input() preselectedCategoryId?: string;

  amountStr = '15';
  merchant = '';
  expenseDate: string = this.getTodayDateString();

  categories: Category[] = [];
  selectedCategory: Category | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private expensesFacade: ExpensesFacade,
    private budgetFacade: BudgetFacade,
    public currencyService: CurrencyService
  ) {
    addIcons({
      closeOutline,
      refreshOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      checkmarkOutline,
      backspaceOutline,
      calendarOutline
    });
  }

  get todayDate(): string {
    return this.getTodayDateString();
  }

  get yesterdayDate(): string {
    return this.getYesterdayDateString();
  }

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getYesterdayDateString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  setDate(preset: 'today' | 'yesterday'): void {
    if (preset === 'today') {
      this.expenseDate = this.getTodayDateString();
    } else {
      this.expenseDate = this.getYesterdayDateString();
    }
  }

  async ngOnInit(): Promise<void> {
    await this.budgetFacade.load();
    this.categories = this.budgetFacade.categories();
    if (this.categories.length > 0) {
      if (this.preselectedCategoryId) {
        const match = this.categories.find(c => c.id === this.preselectedCategoryId);
        this.selectedCategory = match || this.categories[0];
      } else {
        this.selectedCategory = this.categories[0];
      }
    }
  }

  get equivText(): string {
    const val = parseFloat(this.amountStr) || 0;
    if (this.currencyService.activeCurrency() === 'GHS') {
      return this.currencyService.formatEquiv(val);
    }
    const ghsVal = this.currencyService.toGhs(val);
    return `≈ ${ghsVal.toFixed(2)} GHS`;
  }

  addPill(val: number): void {
    const cur = parseFloat(this.amountStr) || 0;
    this.amountStr = String(cur + val);
  }

  pressNum(char: string): void {
    if (char === 'del') {
      this.amountStr = this.amountStr.length > 1 ? this.amountStr.slice(0, -1) : '0';
    } else if (char === '.') {
      if (!this.amountStr.includes('.')) {
        this.amountStr += '.';
      }
    } else {
      if (this.amountStr === '0' || this.amountStr === '15') {
        this.amountStr = char;
      } else {
        this.amountStr += char;
      }
    }
  }

  selectCategory(cat: Category): void {
    this.selectedCategory = cat;
  }

  dismiss(): void {
    this.modalCtrl.dismiss({ saved: false });
  }

  async saveExpense(): Promise<void> {
    const amount = parseFloat(this.amountStr);
    if (!amount || amount <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter a valid amount greater than 0.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (!this.selectedCategory) {
      this.selectedCategory = this.categories[0];
    }

    const activeCurrency = this.currencyService.activeCurrency();
    const amountGhs = activeCurrency === 'GHS' ? amount : this.currencyService.toGhs(amount);

    // Compute effective ISO date (respecting custom backdated date if selected)
    let finalDateIso: string;
    const todayStr = this.getTodayDateString();
    if (this.expenseDate === todayStr) {
      finalDateIso = new Date().toISOString();
    } else if (this.expenseDate) {
      // Use noon UTC for past dates to avoid local timezone day-shift
      finalDateIso = new Date(`${this.expenseDate}T12:00:00.000Z`).toISOString();
    } else {
      finalDateIso = new Date().toISOString();
    }

    const newExpense: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      amount: amountGhs,
      currency: 'GHS',
      categoryId: this.selectedCategory.id,
      categoryName: this.selectedCategory.name,
      merchant: this.merchant.trim() || undefined,
      note: activeCurrency === 'XOF' ? `Paid ${amount} XOF` : undefined,
      date: finalDateIso,
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    // Updates repository + updates signal state immediately
    await this.expensesFacade.addExpense(newExpense);

    // M. Pognon Proactive Threshold Alerts (FR14)
    const cons = this.budgetFacade.consumption();
    let toastMessage = `Expense of ${amount.toFixed(2)} ${activeCurrency} recorded!`;
    let toastColor: 'success' | 'warning' | 'danger' = 'success';

    if (!cons.isDiscoveryMode) {
      if (cons.consumedPercent >= 100) {
        toastMessage = `⚠️ M. Pognon: Budget ceiling exceeded (${cons.consumedPercent}%)! Freeze non-essential buys.`;
        toastColor = 'danger';
      } else if (cons.consumedPercent >= 90) {
        toastMessage = `🚨 M. Pognon: 90% threshold reached! Only ${cons.balanceGhs.toFixed(0)} GHS remaining.`;
        toastColor = 'warning';
      } else if (cons.consumedPercent >= 70) {
        toastMessage = `🧐 M. Pognon: 70% threshold crossed. Keep meals to campus cafeteria!`;
        toastColor = 'warning';
      }
    }

    const toast = await this.toastCtrl.create({
      message: toastMessage,
      duration: 3200,
      color: toastColor,
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ saved: true, expense: newExpense });
  }
}
