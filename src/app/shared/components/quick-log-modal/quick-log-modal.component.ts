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
  backspaceOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../../core/db/database.service';
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
  amountStr = '15';
  merchant = '';

  categories: Category[] = [];
  selectedCategory: Category | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private db: DatabaseService,
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
      backspaceOutline
    });
  }

  async ngOnInit() {
    this.categories = await this.db.getCategories();
    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0];
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

  addPill(val: number) {
    const cur = parseFloat(this.amountStr) || 0;
    this.amountStr = String(cur + val);
  }

  pressNum(char: string) {
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

  selectCategory(cat: Category) {
    this.selectedCategory = cat;
  }

  dismiss() {
    this.modalCtrl.dismiss({ saved: false });
  }

  async saveExpense() {
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

    const newExpense: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      amount: amountGhs,
      currency: 'GHS',
      categoryId: this.selectedCategory.id,
      categoryName: this.selectedCategory.name,
      merchant: this.merchant.trim() || undefined,
      note: activeCurrency === 'XOF' ? `Paid ${amount} XOF` : undefined,
      date: new Date().toISOString(),
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    await this.db.addExpense(newExpense);

    const toast = await this.toastCtrl.create({
      message: `Expense of ${amount.toFixed(2)} ${activeCurrency} recorded!`,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ saved: true, expense: newExpense });
  }
}
