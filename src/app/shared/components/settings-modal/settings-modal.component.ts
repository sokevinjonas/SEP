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
    IonIcon
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="settings-toolbar">
        <ion-title class="settings-title">Paramètres &amp; Devises</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" class="close-btn">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="settings-content ion-padding">

      <!-- Manual Exchange Rate Section (FR3) -->
      <section class="card-box">
        <div class="card-header-row">
          <ion-icon name="globe-outline" class="card-header-icon"></ion-icon>
          <h4>Taux de Change Manuel (XOF / GHS)</h4>
        </div>
        <p class="card-desc">
          Saisis le taux négocié au change à Accra ou à la frontière. Aucune API externe requise.
        </p>

        <div class="rate-input-container">
          <span class="rate-prefix">1 GHS =</span>
          <input
            type="number"
            class="rate-input"
            [(ngModel)]="exchangeRate"
            min="1"
            step="0.5" />
          <span class="rate-suffix">XOF</span>
        </div>
      </section>

      <!-- Monthly Budget Ceiling -->
      <section class="card-box">
        <div class="card-header-row">
          <ion-icon name="wallet-outline" class="card-header-icon"></ion-icon>
          <h4>Plafond Budgétaire Mensuel</h4>
        </div>
        <p class="card-desc">
          Allocation totale allouée pour le mois en cours.
        </p>

        <div class="rate-input-container">
          <span class="rate-prefix">Budget :</span>
          <input
            type="number"
            class="rate-input"
            [(ngModel)]="totalBudgetGhs"
            min="50"
            step="10" />
          <span class="rate-suffix">GHS</span>
        </div>
      </section>

      <!-- Category Envelopes -->
      <section class="card-box">
        <div class="card-header-row">
          <ion-icon name="restaurant-outline" class="card-header-icon"></ion-icon>
          <h4>Enveloppes par Catégorie</h4>
        </div>

        <div class="cat-list">
          <div *ngFor="let cat of categories" class="cat-row">
            <div class="cat-name-box">
              <ion-icon [name]="cat.icon"></ion-icon>
              <span>{{ cat.name }}</span>
            </div>
            <div class="cat-input-box">
              <input
                type="number"
                class="cat-amount-input"
                [(ngModel)]="cat.monthlyAllocationGhs"
                min="0" />
              <span>GHS</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Save Configuration Button -->
      <ion-button
        expand="block"
        class="save-btn"
        (click)="saveSettings()"
        id="btn-save-settings">
        <ion-icon slot="start" name="save-outline"></ion-icon>
        Enregistrer les Paramètres
      </ion-button>

      <!-- CSV Data Export (FR4) -->
      <section class="card-box export-card">
        <div class="card-header-row">
          <ion-icon name="download-outline" class="card-header-icon action"></ion-icon>
          <h4>Exportation des Données (CSV)</h4>
        </div>
        <p class="card-desc">
          Télécharge l'intégralité de tes transactions au format tableur standard (RFC 4180).
        </p>

        <ion-button
          expand="block"
          class="export-btn"
          (click)="exportData()"
          id="btn-export-csv">
          <ion-icon slot="start" name="download-outline"></ion-icon>
          Télécharger SEP_Expenses.csv
        </ion-button>
      </section>

      <!-- Offline-first status badge -->
      <div class="sync-status-badge">
        <ion-icon name="cloud-done-outline"></ion-icon>
        <span>Stockage local IndexedDB actif · 100% hors-ligne</span>
      </div>

    </ion-content>
  `,
  styles: [`
    .settings-toolbar {
      --background: var(--sep-base, #F7F3F6);
      --color: var(--sep-primary, #714B67);
      padding: 6px 4px 0;
    }
    .settings-title {
      font-size: 17px;
      font-weight: 900;
      color: var(--sep-primary, #714B67);
      text-align: center;
    }
    .close-btn {
      --color: var(--sep-mut, #6B5966);
    }
    .settings-content {
      --background: var(--sep-base, #F7F3F6);
    }
    .card-box {
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 18px;
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: 0 2px 8px rgba(113, 75, 103, 0.05);
    }
    .card-header-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .card-header-icon {
      font-size: 18px;
      color: var(--sep-primary, #714B67);
    }
    .card-header-icon.action {
      color: var(--sep-action, #017e84);
    }
    .card-box h4 {
      font-size: 13px;
      font-weight: 900;
      color: var(--sep-primary, #714B67);
      margin: 0;
    }
    .card-desc {
      font-size: 11px;
      font-weight: 600;
      color: var(--sep-mut, #6B5966);
      margin: 2px 0 12px;
      line-height: 1.35;
    }
    .rate-input-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--sep-base, #F7F3F6);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 12px;
      padding: 8px 12px;
    }
    .rate-prefix {
      font-size: 13px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
    }
    .rate-input {
      width: 80px;
      height: 34px;
      border: 1.5px solid var(--sep-primary-light, #8d6482);
      border-radius: 8px;
      text-align: center;
      font-family: inherit;
      font-size: 14px;
      font-weight: 900;
      color: var(--sep-primary, #714B67);
      outline: none;
      background: #ffffff;
    }
    .rate-suffix {
      font-size: 13px;
      font-weight: 800;
      color: var(--sep-primary, #714B67);
    }
    .cat-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed var(--sep-line, #EADFE7);
    }
    .cat-row:last-child {
      border-bottom: none;
    }
    .cat-name-box {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
    }
    .cat-name-box ion-icon {
      font-size: 16px;
      color: var(--sep-primary, #714B67);
    }
    .cat-input-box {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--sep-mut, #6B5966);
    }
    .cat-amount-input {
      width: 65px;
      height: 30px;
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 6px;
      text-align: center;
      font-family: inherit;
      font-size: 12px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
      background: #ffffff;
    }
    .save-btn {
      --background: var(--sep-primary, #714B67);
      --border-radius: 14px;
      font-weight: 900;
      font-size: 13px;
      min-height: 48px;
      height: 48px;
      margin: 0 0 14px;
      box-shadow: 0 4px 14px rgba(113, 75, 103, 0.35);
    }
    .export-card {
      border-color: var(--sep-action, #017e84);
      background: #fafdfd;
    }
    .export-btn {
      --background: var(--sep-action, #017e84);
      --border-radius: 12px;
      font-weight: 800;
      font-size: 13px;
      min-height: 44px;
      height: 44px;
      margin: 0;
    }
    .sync-status-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: var(--sep-action, #017e84);
      padding: 10px 0;
    }
    .sync-status-badge ion-icon {
      font-size: 16px;
    }
  `]
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
    private exportService: ExportService
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
    this.exchangeRate = this.monthlyBudget.exchangeRateXof || 42;
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
