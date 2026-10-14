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
    IonIcon
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="modal-toolbar">
        <ion-title class="modal-title">Dépense Rapide</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" class="close-btn">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content ion-padding">
      <!-- Amount Display Card -->
      <div class="amount-card">
        <span class="amount-caption">Montant de la dépense</span>
        <div class="amount-hero">
          <span class="amount-number">{{ amountStr }}</span>
          <span class="amount-currency">{{ currency }}</span>
        </div>
        <span class="amount-equiv">{{ equivText }}</span>

        <!-- Quick Incremental Pills -->
        <div class="pill-row">
          <button type="button" class="quick-pill" (click)="addPill(5)">+5</button>
          <button type="button" class="quick-pill" (click)="addPill(10)">+10</button>
          <button type="button" class="quick-pill" (click)="addPill(20)">+20</button>
          <button type="button" class="quick-pill" (click)="addPill(50)">+50</button>
        </div>
      </div>

      <!-- Categories Grid (1 Tap) -->
      <div class="section-label-row">
        <span class="section-label">Catégorie (1 tap)</span>
      </div>
      <div class="category-grid">
        <div
          *ngFor="let cat of categories"
          class="cat-chip"
          [class.selected]="selectedCategory?.id === cat.id"
          (click)="selectCategory(cat)">
          <ion-icon [name]="cat.icon"></ion-icon>
          <span>{{ cat.name }}</span>
        </div>
      </div>

      <!-- Optional Merchant Field -->
      <div class="input-field-row">
        <input
          type="text"
          class="merchant-input"
          placeholder="Lieu / Note (optionnel, ex: Waakye)"
          [(ngModel)]="merchant" />
      </div>

      <!-- Numpad -->
      <div class="numpad-grid">
        <button type="button" class="num-key" (click)="pressNum('1')">1</button>
        <button type="button" class="num-key" (click)="pressNum('2')">2</button>
        <button type="button" class="num-key" (click)="pressNum('3')">3</button>
        <button type="button" class="num-key" (click)="pressNum('4')">4</button>
        <button type="button" class="num-key" (click)="pressNum('5')">5</button>
        <button type="button" class="num-key" (click)="pressNum('6')">6</button>
        <button type="button" class="num-key" (click)="pressNum('7')">7</button>
        <button type="button" class="num-key" (click)="pressNum('8')">8</button>
        <button type="button" class="num-key" (click)="pressNum('9')">9</button>
        <button type="button" class="num-key" (click)="pressNum('.')">.</button>
        <button type="button" class="num-key" (click)="pressNum('0')">0</button>
        <button type="button" class="num-key del-key" (click)="pressNum('del')">
          <ion-icon name="backspace-outline"></ion-icon>
        </button>
      </div>

      <!-- Save Button (Tap 3) -->
      <ion-button
        expand="block"
        class="save-btn"
        (click)="saveExpense()"
        id="btn-save-expense">
        <ion-icon slot="start" name="checkmark-outline"></ion-icon>
        Valider la Dépense (Tap 3)
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .modal-toolbar {
      --background: var(--sep-base, #F7F3F6);
      --color: var(--sep-primary, #714B67);
      padding: 6px 4px 0;
    }
    .modal-title {
      font-size: 17px;
      font-weight: 900;
      color: var(--sep-primary, #714B67);
      text-align: center;
    }
    .close-btn {
      --color: var(--sep-mut, #6B5966);
    }
    .modal-content {
      --background: var(--sep-base, #F7F3F6);
    }

    /* Amount Card */
    .amount-card {
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 20px;
      padding: 16px;
      text-align: center;
      margin-bottom: 12px;
      box-shadow: 0 4px 14px rgba(113, 75, 103, 0.06);
    }
    .amount-caption {
      font-size: 11px;
      font-weight: 800;
      color: var(--sep-mut, #6B5966);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .amount-hero {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
      margin: 4px 0;
    }
    .amount-number {
      font-size: 38px;
      font-weight: 900;
      color: var(--sep-primary-dark, #58354f);
    }
    .amount-currency {
      font-size: 18px;
      font-weight: 800;
      color: var(--sep-primary, #714B67);
    }
    .amount-equiv {
      font-size: 11px;
      font-weight: 700;
      color: var(--sep-mut, #6B5966);
      display: block;
      margin-bottom: 8px;
    }

    /* Quick Pills */
    .pill-row {
      display: flex;
      gap: 6px;
      justify-content: center;
    }
    .quick-pill {
      flex: 1;
      height: 34px;
      background: var(--sep-base, #F7F3F6);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 9999px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 800;
      color: var(--sep-primary, #714B67);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .quick-pill:active {
      background: var(--sep-primary-soft, #f4ecf2);
    }

    /* Category Grid */
    .section-label-row {
      margin: 8px 2px 6px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 800;
      color: var(--sep-mut, #6B5966);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .cat-chip {
      background: var(--sep-card, #FFFFFF);
      border: 1.5px solid var(--sep-line, #EADFE7);
      border-radius: 12px;
      padding: 8px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    .cat-chip ion-icon {
      font-size: 20px;
      color: var(--sep-primary, #714B67);
    }
    .cat-chip span {
      font-size: 10px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
      line-height: 1.1;
    }
    .cat-chip.selected {
      border-color: var(--sep-primary, #714B67);
      background: var(--sep-primary-soft, #f4ecf2);
    }

    /* Merchant Input */
    .input-field-row {
      margin-bottom: 12px;
    }
    .merchant-input {
      width: 100%;
      height: 40px;
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 12px;
      padding: 0 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      color: var(--sep-ink, #2B1F28);
      outline: none;
    }

    /* Numpad */
    .numpad-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 14px;
    }
    .num-key {
      height: 44px;
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 10px;
      font-family: inherit;
      font-size: 18px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 1px 4px rgba(113, 75, 103, 0.04);
    }
    .num-key:active {
      background: var(--sep-base, #F7F3F6);
    }
    .del-key ion-icon {
      font-size: 18px;
      color: var(--sep-danger, #c0392b);
    }

    /* Save Button */
    .save-btn {
      --background: var(--sep-action, #017e84);
      --border-radius: 14px;
      font-weight: 900;
      font-size: 14px;
      min-height: 50px;
      height: 50px;
      margin: 0;
      box-shadow: 0 4px 14px rgba(1, 126, 132, 0.35);
    }
  `]
})
export class QuickLogModalComponent implements OnInit {
  amountStr = '15';
  currency: 'GHS' | 'XOF' = 'GHS';
  exchangeRate = 42;
  merchant = '';

  categories: Category[] = [];
  selectedCategory: Category | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private db: DatabaseService
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
      this.selectedCategory = this.categories[0]; // Default to first (Food)
    }
    const budget = await this.db.getMonthlyBudget();
    this.exchangeRate = budget.exchangeRateXof || 42;
  }

  get equivText(): string {
    const val = parseFloat(this.amountStr) || 0;
    if (this.currency === 'GHS') {
      return `≈ ${Math.round(val * this.exchangeRate).toLocaleString()} XOF`;
    }
    return `≈ ${(val / this.exchangeRate).toFixed(2)} GHS`;
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
        message: 'Veuillez saisir un montant valide supérieur à 0.',
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

    const newExpense: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      amount: amount,
      currency: this.currency,
      categoryId: this.selectedCategory.id,
      categoryName: this.selectedCategory.name,
      merchant: this.merchant.trim() || undefined,
      note: this.merchant.trim() || undefined,
      date: new Date().toISOString(),
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    await this.db.addExpense(newExpense);

    const toast = await this.toastCtrl.create({
      message: `Dépense de ${amount.toFixed(2)} ${this.currency} enregistrée !`,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.modalCtrl.dismiss({ saved: true, expense: newExpense });
  }
}
