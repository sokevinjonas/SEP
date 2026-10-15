import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
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
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonChip,
  IonSpinner,
  IonAvatar,
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
  trashOutline,
  saveOutline,
  sparklesOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../core/db/database.service';
import { CurrencyService, CurrencyCode, LiveRateInfo } from '../../core/services/currency.service';
import { LocationService, CountryItem } from '../../core/services/location.service';
import { ExportService } from '../../core/services/export.service';
import { Category, MonthlyBudget, UserProfile } from '../../core/models/financial.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
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
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonChip,
    IonSpinner,
    IonAvatar
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
    campus: 'University of Ghana (Legon)',
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
      trashOutline,
      saveOutline,
      sparklesOutline,
      checkmarkCircleOutline
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

    this.rateStatusText = `Current Rate: 1 ${this.currencyService.activeCurrency()} = ${this.currencyService.exchangeRate()} ${this.currencyService.secondaryCurrency()}`;
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
      this.showToast('Please enter your name.', 'warning');
      return;
    }

    if (this.monthlyBudget.totalBudgetGhs <= 0) {
      this.showToast('Monthly budget must be greater than zero.', 'warning');
      return;
    }

    if (this.monthlyBudget.exchangeRateXof <= 0) {
      this.showToast('Exchange rate must be greater than zero.', 'warning');
      return;
    }

    // 1. Update Profile in DB
    this.userProfile.updatedAt = new Date().toISOString();
    await this.db.saveUserProfile(this.userProfile);

    // 2. Update Budget in DB
    this.monthlyBudget.plannedDailyBudgetGhs = Math.round(this.monthlyBudget.totalBudgetGhs / 30);
    await this.db.saveMonthlyBudget(this.monthlyBudget);

    // 3. Update Currency Service
    await this.currencyService.setCurrency(this.userProfile.primaryCurrency);
    await this.currencyService.setExchangeRate(this.monthlyBudget.exchangeRateXof);

    // 4. Update Categories
    for (const cat of this.categories) {
      await this.db.addCategory(cat);
    }

    await this.showToast('Profile, currencies, and budget saved to local database!', 'success');
  }

  async exportCsv(): Promise<void> {
    const expenses = await this.db.getExpenses();
    if (expenses.length === 0) {
      this.showToast('No expenses logged yet to export.', 'warning');
      return;
    }

    this.exportService.exportExpensesToCsv(expenses);
    this.showToast(`Exported ${expenses.length} transactions to CSV!`, 'success');
  }

  async confirmResetData(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reset Local Database?',
      message: 'This will reset all your logged expenses and restore default campus seeds. This cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset Database',
          role: 'destructive',
          handler: async () => {
            await this.db.clearAllData();
            await this.loadProfileData();
            this.showToast('Database reset to fresh campus defaults.', 'success');
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
