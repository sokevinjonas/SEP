import { Component, Input, OnInit, inject, signal } from '@angular/core';
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
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  trashOutline,
  calendarOutline,
  timeOutline,
  receiptOutline,
  storefrontOutline,
  pricetagOutline,
  chatbubbleEllipsesOutline,
  documentTextOutline,
  phonePortraitOutline,
  createOutline,
  fingerPrintOutline,
  walletOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  saveOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { Expense, Category } from '../../../core/models/financial.models';
import { CurrencyService } from '../../../core/services/currency.service';
import { BudgetFacade } from '../../../features/budget/facade/budget.facade';
import { ExpensesFacade } from '../../../features/expenses/facade/expenses.facade';

@Component({
  selector: 'app-expense-detail-modal',
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
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea
  ],
  templateUrl: './expense-detail-modal.component.html',
  styleUrls: ['./expense-detail-modal.component.scss']
})
export class ExpenseDetailModalComponent implements OnInit {
  @Input({ required: true }) expense!: Expense;

  readonly currencyService = inject(CurrencyService);
  readonly budgetFacade = inject(BudgetFacade);
  private readonly expensesFacade = inject(ExpensesFacade);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  readonly isEditing = signal(false);

  // Edit form state
  editAmount: number = 0;
  editCurrency: 'GHS' | 'XOF' = 'GHS';
  editMerchant: string = '';
  editCategoryId: string = '';
  editNote: string = '';
  editDate: string = '';

  category?: Category;

  constructor() {
    addIcons({
      closeOutline,
      trashOutline,
      calendarOutline,
      timeOutline,
      receiptOutline,
      storefrontOutline,
      pricetagOutline,
      chatbubbleEllipsesOutline,
      documentTextOutline,
      phonePortraitOutline,
      createOutline,
      fingerPrintOutline,
      walletOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      saveOutline,
      checkmarkOutline
    });
  }

  ngOnInit(): void {
    this.refreshCategory();
  }

  refreshCategory(): void {
    if (this.expense?.categoryId) {
      this.category = this.budgetFacade.categories().find(c => c.id === this.expense.categoryId);
    }
  }

  get categoryIcon(): string {
    return this.category?.icon || 'wallet-outline';
  }

  get categoryColor(): string {
    return this.category?.color || '#714B67';
  }

  get sourceLabel(): string {
    switch (this.expense?.source) {
      case 'ocr_momo':
        return 'Mobile Money (MoMo SMS / Receipt)';
      case 'ocr_receipt':
        return 'Scanned Receipt (OCR)';
      case 'manual':
      default:
        return 'Manual Entry';
    }
  }

  get sourceIcon(): string {
    switch (this.expense?.source) {
      case 'ocr_momo':
        return 'phone-portrait-outline';
      case 'ocr_receipt':
        return 'document-text-outline';
      case 'manual':
      default:
        return 'create-outline';
    }
  }

  startEditing(): void {
    this.editAmount = this.expense.amount;
    this.editCurrency = this.expense.currency;
    this.editMerchant = this.expense.merchant || '';
    this.editCategoryId = this.expense.categoryId;
    this.editNote = this.expense.note || '';
    this.editDate = this.expense.date ? this.expense.date.substring(0, 10) : new Date().toISOString().substring(0, 10);
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
  }

  async saveChanges(): Promise<void> {
    if (!this.editAmount || this.editAmount <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter a valid expense amount greater than 0',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const selectedCategory = this.budgetFacade.categories().find(c => c.id === this.editCategoryId);

    const updatedExpense: Expense = {
      ...this.expense,
      amount: Number(this.editAmount),
      currency: this.editCurrency,
      merchant: this.editMerchant.trim() || undefined,
      categoryId: this.editCategoryId,
      categoryName: selectedCategory ? selectedCategory.name : (this.expense.categoryName || 'General'),
      note: this.editNote.trim() || undefined,
      date: this.editDate ? new Date(this.editDate).toISOString() : this.expense.date
    };

    try {
      await this.expensesFacade.updateExpense(updatedExpense);
      this.expense = updatedExpense;
      this.refreshCategory();
      this.isEditing.set(false);

      const toast = await this.toastCtrl.create({
        message: 'Expense updated successfully! ✓',
        duration: 2500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Error updating expense',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Expense?',
      message: `Are you sure you want to delete this expense of ${this.expense.amount.toFixed(2)} ${this.expense.currency} (${this.expense.merchant || this.expense.categoryName})? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.expensesFacade.deleteExpense(this.expense.id);
              const toast = await this.toastCtrl.create({
                message: 'Expense deleted successfully',
                duration: 2500,
                color: 'success',
                position: 'top'
              });
              await toast.present();
              await this.modalCtrl.dismiss({ deleted: true, expenseId: this.expense.id }, 'deleted');
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
