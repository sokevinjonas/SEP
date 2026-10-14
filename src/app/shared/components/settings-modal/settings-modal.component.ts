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
  ellipsisHorizontalCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../../core/db/database.service';
import { ExportService } from '../../../core/services/export.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { Category, MonthlyBudget } from '../../../core/models/financial.models';

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
  totalBudgetGhs = 600;
  categories: Category[] = [];
  monthlyBudget: MonthlyBudget | null = null;

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
    this.monthlyBudget = await this.db.getMonthlyBudget();
    this.exchangeRate = this.currencyService.exchangeRate() || this.monthlyBudget.exchangeRateXof || 42;
    this.totalBudgetGhs = this.monthlyBudget.totalBudgetGhs || 600;
    this.categories = await this.db.getCategories();
  }

  dismiss(updated = false) {
    this.modalCtrl.dismiss({ updated });
  }

  async saveSettings() {
    if (this.exchangeRate <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Le taux de change doit être supérieur à zéro.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
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
      message: 'Paramètres et devises enregistrés avec succès !',
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
        message: 'Aucune dépense à exporter pour le moment.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.exportService.exportExpensesToCsv(expenses);

    const toast = await this.toastCtrl.create({
      message: `${expenses.length} dépenses exportées en CSV avec succès !`,
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
