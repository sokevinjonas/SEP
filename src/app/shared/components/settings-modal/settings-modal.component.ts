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
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonNote,
  IonIcon,
  ModalController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  saveOutline,
  downloadOutline,
  globeOutline,
  walletOutline,
  cloudDoneOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  personOutline,
  ellipsisHorizontalCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../../core/db/database.service';
import { ExportService } from '../../../core/services/export.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Category, MonthlyBudget, UserProfile } from '../../../core/models/financial.models';

@Component({
  selector: 'app-settings-modal',
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
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonNote,
    IonIcon
  ],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss']
})
export class SettingsModalComponent implements OnInit {
  exchangeRate = 42;
  totalBudgetGhs = 0;
  categories: Category[] = [];
  monthlyBudget: MonthlyBudget | null = null;
  userProfile: UserProfile | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private db: DatabaseService,
    private exportService: ExportService,
    private currencyService: CurrencyService
  ) {
    addIcons({
      closeOutline,
      saveOutline,
      downloadOutline,
      globeOutline,
      walletOutline,
      personOutline,
      cloudDoneOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline
    });
  }

  async ngOnInit() {
    this.userProfile = await this.db.getUserProfile();
    this.monthlyBudget = await this.db.getMonthlyBudget();
    this.exchangeRate = this.currencyService.exchangeRate() || this.monthlyBudget?.exchangeRateXof || 42;
    this.totalBudgetGhs = this.monthlyBudget?.totalBudgetGhs || 0;
    this.categories = await this.db.getCategories();
  }

  dismiss(updated = false) {
    this.modalCtrl.dismiss({ updated });
  }

  async saveSettings() {
    if (this.exchangeRate <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Exchange rate must be greater than zero.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (this.userProfile) {
      await this.db.saveUserProfile(this.userProfile);
    }

    await this.currencyService.setExchangeRate(this.exchangeRate);

    if (this.monthlyBudget) {
      this.monthlyBudget.exchangeRateXof = this.exchangeRate;
      this.monthlyBudget.totalBudgetGhs = this.totalBudgetGhs;
      this.monthlyBudget.plannedDailyBudgetGhs = Math.round(this.totalBudgetGhs / 30);
      await this.db.saveMonthlyBudget(this.monthlyBudget);
    }

    for (const cat of this.categories) {
      await this.db.addCategory(cat);
    }

    const toast = await this.toastCtrl.create({
      message: 'Settings and currencies saved successfully!',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.dismiss(true);
  }

  async exportData() {
    const expenses = await this.db.getExpenses();
    if (expenses.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No expenses to export at this time.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.exportService.exportExpensesToCsv(expenses);

    const toast = await this.toastCtrl.create({
      message: `${expenses.length} expenses exported to CSV successfully!`,
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
