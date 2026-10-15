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
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonChip,
  IonSpinner,
  IonAvatar,
  IonNote,
  IonBadge,
  IonModal,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  schoolOutline,
  globeOutline,
  businessOutline,
  walletOutline,
  cashOutline,
  refreshOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  shieldCheckmarkOutline,
  downloadOutline,
  cloudDoneOutline,
  cloudUploadOutline,
  trashOutline,
  saveOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  closeOutline,
  createOutline,
  logoGoogle,
  cloudOutline,
  checkmarkOutline,
  lockClosedOutline,
  cloudDownloadOutline,
  documentTextOutline
} from 'ionicons/icons';
import { ProfileFacade } from './facade/profile.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { PurchasesFacade } from '../purchases/facade/purchases.facade';
import { IdbService } from '../../core/db/idb.service';
import { CurrencyService, CurrencyCode, LiveRateInfo } from '../../core/services/currency.service';
import { LocationService, CountryItem } from '../../core/services/location.service';
import { ExportService } from '../../core/services/export.service';
import { SyncService } from '../../core/services/sync.service';
import { Category, MonthlyBudget, UserProfile } from '../../core/models/financial.models';

export type SettingsModalType = 'none' | 'profile' | 'currencies' | 'budget';

@Component({
  selector: 'app-profile',
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
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonChip,
    IonSpinner,
    IonAvatar,
    IonNote,
    IonBadge,
    IonModal
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  readonly Math = Math;

  userProfile: UserProfile = {
    id: 'current_user',
    name: '',
    country: 'Ghana',
    city: 'Accra',
    campus: '',
    primaryCurrency: 'GHS',
    hasCompletedOnboarding: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  monthlyBudget: MonthlyBudget = {
    id: '2026-10',
    monthYear: '2026-10',
    totalBudgetGhs: 600,
    plannedDailyBudgetGhs: 20,
    exchangeRateXof: 42.0
  };

  categories: Category[] = [];
  countries: CountryItem[] = [];
  cities: string[] = [];
  suggestedCampuses: string[] = [];

  isLoadingCountries = false;
  isLoadingCities = false;
  isFetchingLiveRate = false;
  liveRateInfo: LiveRateInfo | null = null;
  rateStatusText = '';

  // Settings modals controller
  activeModal: SettingsModalType = 'none';

  // Backup State
  isCloudSyncing = false;

  constructor(
    private profileFacade: ProfileFacade,
    private budgetFacade: BudgetFacade,
    private expensesFacade: ExpensesFacade,
    private purchasesFacade: PurchasesFacade,
    private idbService: IdbService,
    public currencyService: CurrencyService,
    private locationService: LocationService,
    private exportService: ExportService,
    private syncService: SyncService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      personOutline,
      schoolOutline,
      globeOutline,
      businessOutline,
      walletOutline,
      cashOutline,
      refreshOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      shieldCheckmarkOutline,
      downloadOutline,
      cloudDoneOutline,
      cloudUploadOutline,
      cloudDownloadOutline,
      documentTextOutline,
      trashOutline,
      saveOutline,
      sparklesOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      closeOutline,
      createOutline,
      logoGoogle,
      cloudOutline,
      checkmarkOutline,
      lockClosedOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProfileData();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadProfileData();
  }

  async loadProfileData(): Promise<void> {
    // 1. Load data via Facades
    await Promise.all([
      this.profileFacade.load(),
      this.budgetFacade.load()
    ]);

    const profile = this.profileFacade.userProfile();
    if (profile) {
      this.userProfile = { ...profile };
    }

    const budget = this.budgetFacade.monthlyBudget();
    if (budget) {
      this.monthlyBudget = { ...budget };
    }

    this.categories = [...this.budgetFacade.categories()];

    // 2. Load Countries & Cities
    this.isLoadingCountries = true;
    this.countries = await this.locationService.getCountries();
    this.isLoadingCountries = false;

    if (this.userProfile.country) {
      this.cities = await this.locationService.getCitiesForCountry(this.userProfile.country);
      this.suggestedCampuses = this.locationService.getCampusesForCountry(this.userProfile.country);
    }

    this.rateStatusText = `1 ${this.currencyService.activeCurrency()} = ${this.currencyService.exchangeRate()} ${this.currencyService.secondaryCurrency()}`;
  }

  // Modal controls
  openModal(type: SettingsModalType): void {
    this.activeModal = type;
  }

  closeModal(): void {
    this.activeModal = 'none';
  }

  async onCountryChanged(countryName: string): Promise<void> {
    this.userProfile.country = countryName;
    this.isLoadingCities = true;
    this.cities = await this.locationService.getCitiesForCountry(countryName);
    this.isLoadingCities = false;

    if (this.cities.length > 0 && !this.cities.includes(this.userProfile.city)) {
      this.userProfile.city = this.cities[0];
    }

    this.suggestedCampuses = this.locationService.getCampusesForCountry(countryName);
    if (this.suggestedCampuses.length > 0 && !this.userProfile.campus) {
      this.userProfile.campus = this.suggestedCampuses[0];
    }

    const guessedCurr = this.locationService.guessCurrencyForCountry(countryName);
    this.userProfile.primaryCurrency = guessedCurr;
    await this.currencyService.setCurrency(guessedCurr);
    await this.currencyService.setSecondaryCurrency(guessedCurr === 'GHS' ? 'XOF' : 'GHS');
  }

  selectSuggestedCampus(camp: string): void {
    this.userProfile.campus = camp;
  }

  async fetchLiveRate(): Promise<void> {
    this.isFetchingLiveRate = true;
    this.rateStatusText = 'Fetching live market rate...';

    const result = await this.currencyService.fetchLiveRate(
      this.currencyService.activeCurrency(),
      this.currencyService.secondaryCurrency()
    );
    this.isFetchingLiveRate = false;

    if (result) {
      this.liveRateInfo = result;
      this.monthlyBudget.exchangeRateXof = result.rate;
      await this.currencyService.setExchangeRate(result.rate);
      this.rateStatusText = `Live API Rate: 1 ${result.base} = ${result.rate} ${result.target}`;
      this.showToast('Live exchange rate updated from market API!', 'success');
    } else {
      this.rateStatusText = `Benchmark: 1 ${this.currencyService.activeCurrency()} = ${this.monthlyBudget.exchangeRateXof} ${this.currencyService.secondaryCurrency()}`;
      this.showToast('Could not reach rate server; current benchmark kept.', 'warning');
    }
  }

  get dailyAllowance(): number {
    return this.monthlyBudget.totalBudgetGhs > 0
      ? parseFloat((this.monthlyBudget.totalBudgetGhs / 30).toFixed(2))
      : 0;
  }

  get dailyAllowanceSecondary(): number {
    const rate = this.monthlyBudget.exchangeRateXof || 42;
    return Math.round(this.dailyAllowance * rate);
  }

  async saveProfile(): Promise<void> {
    if (!this.userProfile.name.trim()) {
      this.showToast('Veuillez entrer votre nom ou pseudo.', 'warning');
      return;
    }

    this.userProfile.updatedAt = new Date().toISOString();
    await this.profileFacade.saveUserProfile(this.userProfile);
    this.closeModal();
    await this.showToast('Profil étudiant mis à jour avec succès.', 'success');
  }

  async saveCurrencies(): Promise<void> {
    if (this.monthlyBudget.exchangeRateXof <= 0) {
      this.showToast('Le taux de change doit être supérieur à zéro.', 'warning');
      return;
    }

    await this.currencyService.setCurrency(this.userProfile.primaryCurrency);
    await this.currencyService.setExchangeRate(this.monthlyBudget.exchangeRateXof);

    this.monthlyBudget.plannedDailyBudgetGhs = Math.round(this.monthlyBudget.totalBudgetGhs / 30);
    await this.budgetFacade.saveMonthlyBudget(this.monthlyBudget);

    this.closeModal();
    await this.showToast('Devises et taux de change enregistrés.', 'success');
  }

  async saveBudget(): Promise<void> {
    if (this.monthlyBudget.totalBudgetGhs <= 0) {
      this.showToast('Le budget mensuel doit être supérieur à zéro.', 'warning');
      return;
    }

    this.monthlyBudget.plannedDailyBudgetGhs = Math.round(this.monthlyBudget.totalBudgetGhs / 30);
    await this.budgetFacade.saveMonthlyBudget(this.monthlyBudget);

    for (const cat of this.categories) {
      await this.budgetFacade.addCategory(cat);
    }

    this.closeModal();
    await this.showToast('Plafond budgétaire et enveloppes enregistrés.', 'success');
  }

  // Cloudflare D1 & JSON Vault Backup
  async backupToCloud(): Promise<void> {
    this.isCloudSyncing = true;
    const result = await this.syncService.backupToCloud();
    this.isCloudSyncing = false;

    if (result.success) {
      await this.showToast('Données sauvegardées sur le Cloud avec succès !', 'success');
      const alert = await this.alertCtrl.create({
        header: 'Sauvegarde Cloud Réussie',
        message: `Vos ${result.stats?.expenses || 0} dépense(s), ${result.stats?.purchases || 0} achat(s) et vos réglages sont en sécurité sur Cloudflare D1.`,
        buttons: ['Parfait']
      });
      await alert.present();
    } else {
      await this.showToast(result.error || 'Erreur lors de la sauvegarde.', 'danger');
    }
  }

  async restoreFromCloud(): Promise<void> {
    const confirmAlert = await this.alertCtrl.create({
      header: 'Restaurer depuis le Cloud ?',
      message: 'Cette action va charger toutes vos données depuis Cloudflare D1 et actualiser votre téléphone. Continuer ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Restaurer',
          role: 'destructive',
          handler: async () => {
            this.isCloudSyncing = true;
            const res = await this.syncService.restoreFromCloud();
            this.isCloudSyncing = false;

            if (res.success) {
              await Promise.all([
                this.expensesFacade.load(),
                this.purchasesFacade.load(),
                this.budgetFacade.load(),
                this.profileFacade.load()
              ]);
              await this.loadProfileData();
              await this.showToast(`Restauration terminée : ${res.stats?.expenses || 0} dépenses récupérées.`, 'success');
            } else {
              await this.showToast(res.error || 'Erreur lors de la restauration.', 'danger');
            }
          }
        }
      ]
    });
    await confirmAlert.present();
  }

  async exportJsonBackup(): Promise<void> {
    const fullData = await this.idbService.exportAllData();
    this.exportService.exportBackupJson(fullData);
    await this.showToast('Coffre-fort JSON téléchargé ! Conservez ce fichier en lieu sûr.', 'success');
  }

  async triggerFileRestore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const backupData = await this.exportService.readBackupFile(file);
      const confirmAlert = await this.alertCtrl.create({
        header: 'Restaurer ce fichier ?',
        message: `Fichier : ${file.name}\nDépenses détectées : ${backupData.expenses?.length || 0}\nAchats détectés : ${backupData.purchases?.length || 0}\n\nVoulez-vous remplacer vos données actuelles par cette sauvegarde ?`,
        buttons: [
          { text: 'Annuler', role: 'cancel' },
          {
            text: 'Restaurer maintenant',
            role: 'destructive',
            handler: async () => {
              const stats = await this.idbService.restoreAllData(backupData);
              await Promise.all([
                this.expensesFacade.load(),
                this.purchasesFacade.load(),
                this.budgetFacade.load(),
                this.profileFacade.load()
              ]);
              await this.loadProfileData();
              await this.showToast(`Restauration réussie ! ${stats.expenses} dépenses restaurées.`, 'success');
            }
          }
        ]
      });
      await confirmAlert.present();
    } catch (err: any) {
      await this.showToast(err.message || 'Fichier de sauvegarde invalide.', 'danger');
    } finally {
      input.value = '';
    }
  }

  async exportCsv(): Promise<void> {
    await this.expensesFacade.load();
    const expenses = this.expensesFacade.expenses();
    if (expenses.length === 0) {
      this.showToast('Aucune dépense enregistrée à exporter.', 'warning');
      return;
    }

    this.exportService.exportExpensesToCsv(expenses);
    this.showToast(`${expenses.length} transactions exportées en CSV avec succès !`, 'success');
  }

  async confirmResetData(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Réinitialiser la base locale ?',
      message: 'Cette action supprimera toutes vos dépenses enregistrées. Les plafonds et catégories retrouveront leurs valeurs par défaut. Continuer ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Réinitialiser',
          role: 'destructive',
          handler: async () => {
            await this.idbService.resetAll();
            await Promise.all([
              this.expensesFacade.load(),
              this.purchasesFacade.load(),
              this.budgetFacade.load(),
              this.profileFacade.load()
            ]);
            await this.loadProfileData();
            this.showToast('Base de données réinitialisée.', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
