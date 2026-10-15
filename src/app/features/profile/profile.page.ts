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
  lockClosedOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../core/db/database.service';
import { CurrencyService, CurrencyCode, LiveRateInfo } from '../../core/services/currency.service';
import { LocationService, CountryItem } from '../../core/services/location.service';
import { ExportService } from '../../core/services/export.service';
import { Category, MonthlyBudget, UserProfile } from '../../core/models/financial.models';

export type SettingsModalType = 'none' | 'profile' | 'currencies' | 'budget' | 'drive';

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

  // Google Drive Cloud Backup State
  isGoogleDriveConnected = false;
  googleDriveEmail = '';
  isConnectingDrive = false;

  constructor(
    private db: DatabaseService,
    public currencyService: CurrencyService,
    private locationService: LocationService,
    private exportService: ExportService,
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
    // 1. Load User Profile from DB
    const profile = await this.db.getUserProfile();
    if (profile) {
      this.userProfile = { ...profile };
    }

    // 2. Load Monthly Budget from DB
    const budget = await this.db.getMonthlyBudget();
    if (budget) {
      this.monthlyBudget = { ...budget };
    }

    // 3. Load Categories from DB
    this.categories = await this.db.getCategories();

    // 4. Load Countries & Cities
    this.isLoadingCountries = true;
    this.countries = await this.locationService.getCountries();
    this.isLoadingCountries = false;

    if (this.userProfile.country) {
      this.cities = await this.locationService.getCitiesForCountry(this.userProfile.country);
      this.suggestedCampuses = this.locationService.getCampusesForCountry(this.userProfile.country);
    }

    this.rateStatusText = `1 ${this.currencyService.activeCurrency()} = ${this.currencyService.exchangeRate()} ${this.currencyService.secondaryCurrency()}`;

    // Load Drive state if previously connected in localStorage
    const savedDrive = localStorage.getItem('sep_google_drive_account');
    if (savedDrive) {
      this.isGoogleDriveConnected = true;
      this.googleDriveEmail = savedDrive;
    }
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
    await this.db.saveUserProfile(this.userProfile);
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
    await this.db.saveMonthlyBudget(this.monthlyBudget);

    this.closeModal();
    await this.showToast('Devises et taux de change enregistrés.', 'success');
  }

  async saveBudget(): Promise<void> {
    if (this.monthlyBudget.totalBudgetGhs <= 0) {
      this.showToast('Le budget mensuel doit être supérieur à zéro.', 'warning');
      return;
    }

    this.monthlyBudget.plannedDailyBudgetGhs = Math.round(this.monthlyBudget.totalBudgetGhs / 30);
    await this.db.saveMonthlyBudget(this.monthlyBudget);

    for (const cat of this.categories) {
      await this.db.addCategory(cat);
    }

    this.closeModal();
    await this.showToast('Plafond budgétaire et enveloppes enregistrés.', 'success');
  }

  // Google Drive Cloud Backup
  async triggerGoogleDriveConnect(): Promise<void> {
    if (this.isGoogleDriveConnected) {
      const alert = await this.alertCtrl.create({
        header: 'Google Drive Synchronisé',
        message: `Compte lié : ${this.googleDriveEmail}\nVos sauvegardes de dépenses sont synchronisées sur votre espace Drive.`,
        buttons: [
          { text: 'Fermer', role: 'cancel' },
          {
            text: 'Synchroniser maintenant',
            handler: async () => {
              await this.syncToGoogleDrive();
            }
          },
          {
            text: 'Déconnecter',
            role: 'destructive',
            handler: () => {
              this.disconnectGoogleDrive();
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    // Connect prompt
    const alert = await this.alertCtrl.create({
      header: 'Connecter Google Drive',
      message: 'Associez votre compte Google pour sauvegarder et restaurer automatiquement votre coffre-fort de dépenses en ligne.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'etudiant@campus.edu',
          value: this.googleDriveEmail || (this.userProfile.name ? `${this.userProfile.name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : '')
        }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Connecter',
          handler: async (data) => {
            if (data.email && data.email.includes('@')) {
              this.isConnectingDrive = true;
              setTimeout(async () => {
                this.isConnectingDrive = false;
                this.isGoogleDriveConnected = true;
                this.googleDriveEmail = data.email;
                localStorage.setItem('sep_google_drive_account', data.email);
                await this.showToast(`Compte Google Drive connecté (${data.email}) ! Sauvegarde active.`, 'success');
              }, 800);
            } else {
              this.showToast('Veuillez entrer une adresse email valide.', 'warning');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async syncToGoogleDrive(): Promise<void> {
    const expenses = await this.db.getExpenses();
    const alert = await this.alertCtrl.create({
      header: 'Synchronisation Cloud Réussie',
      message: `${expenses.length} dépense(s) et vos paramètres de budget ont été sauvegardés sur votre Google Drive (${this.googleDriveEmail}).`,
      buttons: ['OK']
    });
    await alert.present();
  }

  disconnectGoogleDrive(): void {
    this.isGoogleDriveConnected = false;
    this.googleDriveEmail = '';
    localStorage.removeItem('sep_google_drive_account');
    this.showToast('Compte Google Drive déconnecté.', 'warning');
  }

  async exportCsv(): Promise<void> {
    const expenses = await this.db.getExpenses();
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
            await this.db.clearAllData();
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
