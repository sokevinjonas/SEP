import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonBadge,
  IonSpinner,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  personOutline,
  globeOutline,
  businessOutline,
  schoolOutline,
  walletOutline,
  shieldCheckmarkOutline,
  refreshOutline,
  cashOutline,
  checkmarkCircleOutline,
  cloudDownloadOutline,
  documentTextOutline,
  logInOutline,
  sparklesOutline,
  compassOutline,
  calendarOutline,
  helpCircleOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { ProfileFacade } from '../profile/facade/profile.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { PurchasesFacade } from '../purchases/facade/purchases.facade';
import { CurrencyService, CurrencyCode, LiveRateInfo } from '../../core/services/currency.service';
import { LocationService, CountryItem } from '../../core/services/location.service';
import { SyncService } from '../../core/services/sync.service';
import { IdbService } from '../../core/db/idb.service';
import { ExportService } from '../../core/services/export.service';
import { AlertController } from '@ionic/angular';
import { UserProfile, MonthlyBudget } from '../../core/models/financial.models';

@Component({
  selector: 'app-register',
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
    IonBadge,
    IonSpinner
  ],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage implements OnInit {
  readonly Math = Math;

  currentStep: 1 | 2 = 1;

  userName = '';
  selectedCountry = 'Ghana';
  selectedCity = 'Accra';
  campus = 'University of Ghana (Legon)';

  countries: CountryItem[] = [];
  cities: string[] = [];
  suggestedCampuses: string[] = [];

  isLoadingCountries = false;
  isLoadingCities = false;

  // Financial engine & Budget strategy
  budgetMode: 'fixed' | 'discovery' = 'fixed';
  cycleStartDay = 1;
  customCycleInput = 1;
  showCustomCyclePicker = false;

  primaryCurrency: CurrencyCode = 'GHS';
  secondaryCurrency: CurrencyCode = 'XOF';
  exchangeRate = 42.0;
  monthlyBudget = 600;

  isFetchingLiveRate = false;
  liveRateInfo: LiveRateInfo | null = null;
  rateStatusText = '';

  isRestoring = false;

  constructor(
    private profileFacade: ProfileFacade,
    private budgetFacade: BudgetFacade,
    private expensesFacade: ExpensesFacade,
    private purchasesFacade: PurchasesFacade,
    private currencyService: CurrencyService,
    private locationService: LocationService,
    private syncService: SyncService,
    private idbService: IdbService,
    private exportService: ExportService,
    private alertCtrl: AlertController,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      personOutline,
      globeOutline,
      businessOutline,
      schoolOutline,
      walletOutline,
      shieldCheckmarkOutline,
      refreshOutline,
      cashOutline,
      checkmarkCircleOutline,
      cloudDownloadOutline,
      documentTextOutline,
      logInOutline,
      sparklesOutline,
      compassOutline,
      calendarOutline,
      helpCircleOutline,
      checkmarkOutline
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  async restoreFromCloud(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Restore from Cloud?',
      message: 'Do you want to restore your student expenses, purchases, and settings from the backup server?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Restore',
          handler: async () => {
            this.isRestoring = true;
            const res = await this.syncService.restoreFromCloud();
            this.isRestoring = false;

            if (res.success) {
              await Promise.all([
                this.profileFacade.load(),
                this.budgetFacade.load(),
                this.expensesFacade.load(),
                this.purchasesFacade.load()
              ]);
              await this.showToast(`Data restored successfully! (${res.stats?.expenses || 0} expenses)`, 'success');
              this.router.navigate(['/tabs/home'], { replaceUrl: true });
            } else {
              await this.showToast(res.error || 'Unable to restore data from cloud.', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async triggerFileRestore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const backupData = await this.exportService.readBackupFile(file);
      const alert = await this.alertCtrl.create({
        header: 'Restore Backup File?',
        message: `File: ${file.name}\n${backupData.expenses?.length || 0} expenses detected.\nConfirm restoration?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Restore',
            handler: async () => {
              this.isRestoring = true;
              const stats = await this.idbService.restoreAllData(backupData);
              await Promise.all([
                this.profileFacade.load(),
                this.budgetFacade.load(),
                this.expensesFacade.load(),
                this.purchasesFacade.load()
              ]);
              this.isRestoring = false;
              await this.showToast(`Data restored successfully! (${stats.expenses} expenses)`, 'success');
              this.router.navigate(['/tabs/home'], { replaceUrl: true });
            }
          }
        ]
      });
      await alert.present();
    } catch (err: any) {
      await this.showToast(err.message || 'Invalid backup file.', 'danger');
    } finally {
      input.value = '';
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadCountries();
    await this.onCountryChanged(this.selectedCountry);
    this.fetchLiveRate();
  }

  nextStep(): void {
    if (!this.userName.trim()) {
      this.showToast('Please enter your name or nickname.', 'warning');
      return;
    }

    if (!this.selectedCountry) {
      this.showToast('Please select your study country.', 'warning');
      return;
    }

    if (!this.selectedCity) {
      this.showToast('Please select your study city.', 'warning');
      return;
    }

    if (!this.campus.trim()) {
      this.showToast('Please enter your university campus.', 'warning');
      return;
    }

    this.currentStep = 2;
  }

  prevStep(): void {
    this.currentStep = 1;
  }

  goToStep(step: 1 | 2): void {
    if (step === 1) {
      this.currentStep = 1;
    } else if (step === 2) {
      this.nextStep();
    }
  }

  goBack(): void {
    if (this.currentStep === 2) {
      this.currentStep = 1;
    } else {
      this.router.navigate(['/onboarding']);
    }
  }

  async loadCountries(): Promise<void> {
    this.isLoadingCountries = true;
    this.countries = await this.locationService.getCountries();
    this.isLoadingCountries = false;
  }

  async onCountryChanged(countryName: string): Promise<void> {
    this.selectedCountry = countryName;
    this.isLoadingCities = true;

    // 1. Fetch cities for selected country
    this.cities = await this.locationService.getCitiesForCountry(countryName);
    this.isLoadingCities = false;

    // Pick first city if current city not in list
    if (this.cities.length > 0 && !this.cities.includes(this.selectedCity)) {
      this.selectedCity = this.cities[0];
    }

    // 2. Load campus suggestions for this country
    this.suggestedCampuses = this.locationService.getCampusesForCountry(countryName);
    if (this.suggestedCampuses.length > 0) {
      this.campus = this.suggestedCampuses[0];
    }

    // 3. Automatically adapt primary currency according to country
    const guessedCurr = this.locationService.guessCurrencyForCountry(countryName);
    this.primaryCurrency = guessedCurr;
    this.secondaryCurrency = guessedCurr === 'GHS' ? 'XOF' : 'GHS';

    // 4. Fetch updated live rates
    this.fetchLiveRate();
  }

  onCityChanged(city: string): void {
    this.selectedCity = city;
  }

  selectSuggestedCampus(camp: string): void {
    this.campus = camp;
  }

  async fetchLiveRate(): Promise<void> {
    this.isFetchingLiveRate = true;
    this.rateStatusText = 'Fetching live market rate...';

    const result = await this.currencyService.fetchLiveRate(this.primaryCurrency, this.secondaryCurrency);
    this.isFetchingLiveRate = false;

    if (result) {
      this.liveRateInfo = result;
      this.exchangeRate = result.rate;
      this.rateStatusText = `Live API Rate: 1 ${result.base} = ${result.rate} ${result.target}`;
    } else {
      this.rateStatusText = `Benchmark Rate: 1 ${this.primaryCurrency} = ${this.exchangeRate} ${this.secondaryCurrency}`;
    }
  }


  selectBudgetMode(mode: 'fixed' | 'discovery'): void {
    this.budgetMode = mode;
  }

  selectCycleDay(day: number): void {
    this.cycleStartDay = Math.min(28, Math.max(1, day));
    this.showCustomCyclePicker = false;
  }

  openCustomCyclePicker(): void {
    this.showCustomCyclePicker = true;
    this.customCycleInput = this.cycleStartDay;
  }

  applyCustomCycleDay(): void {
    const val = parseInt(String(this.customCycleInput), 10);
    if (!isNaN(val) && val >= 1 && val <= 28) {
      this.cycleStartDay = val;
      this.showCustomCyclePicker = false;
    } else {
      this.showToast('Please select a cycle start day between 1 and 28.', 'warning');
    }
  }

  get dailyAllowance(): number {
    return this.monthlyBudget > 0 ? parseFloat((this.monthlyBudget / 30).toFixed(2)) : 0;
  }

  get dailyAllowanceSecondary(): number {
    return Math.round(this.dailyAllowance * this.exchangeRate);
  }

  async completeRegistration(): Promise<void> {
    if (!this.userName.trim()) {
      this.showToast('Please enter your name or nickname.', 'warning');
      return;
    }

    if (!this.selectedCountry) {
      this.showToast('Please select your study country.', 'warning');
      return;
    }

    if (!this.selectedCity) {
      this.showToast('Please select your study city.', 'warning');
      return;
    }

    if (!this.campus.trim()) {
      this.showToast('Please enter your university campus.', 'warning');
      return;
    }

    if (this.budgetMode === 'fixed' && (this.monthlyBudget <= 0 || this.exchangeRate <= 0)) {
      this.showToast('Budget ceiling and exchange rate must be greater than zero.', 'warning');
      return;
    }

    if (this.exchangeRate <= 0) {
      this.showToast('Exchange rate must be greater than zero.', 'warning');
      return;
    }

    const isDiscovery = this.budgetMode === 'discovery';
    const effectiveBudget = isDiscovery ? 0 : this.monthlyBudget;
    const safeCycleDay = Math.min(28, Math.max(1, this.cycleStartDay || 1));

    // 1. Save User Profile via ProfileFacade
    const profile: UserProfile = {
      id: 'current_user',
      name: this.userName.trim(),
      country: this.selectedCountry,
      city: this.selectedCity,
      campus: this.campus.trim(),
      primaryCurrency: this.primaryCurrency,
      hasCompletedOnboarding: true,
      budgetMode: this.budgetMode,
      cycleStartDay: safeCycleDay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.profileFacade.saveUserProfile(profile);

    // 2. Save Monthly Budget & Rates via BudgetFacade
    await this.budgetFacade.load();
    const existingBudget = this.budgetFacade.monthlyBudget();
    const budget: MonthlyBudget = {
      id: existingBudget?.id || '2026-10',
      monthYear: existingBudget?.monthYear || '2026-10',
      totalBudgetGhs: effectiveBudget,
      exchangeRateXof: this.exchangeRate,
      plannedDailyBudgetGhs: isDiscovery ? 0 : Math.round(this.monthlyBudget / 30),
      isDiscoveryMode: isDiscovery,
      cycleStartDay: safeCycleDay
    };
    await this.budgetFacade.saveMonthlyBudget(budget);

    // 3. Update Currency Service
    await this.currencyService.setCurrency(this.primaryCurrency);
    await this.currencyService.setSecondaryCurrency(this.secondaryCurrency);
    await this.currencyService.setExchangeRate(this.exchangeRate);

    const welcomeMsg = isDiscovery
      ? `Welcome, ${profile.name}! Discovery Mode activated. M. Pognon will observe your expenses until day ${safeCycleDay}.`
      : `Welcome, ${profile.name}! Your campus vault with ${effectiveBudget} ${this.primaryCurrency} budget is ready.`;

    await this.showToast(welcomeMsg, 'success');

    // 4. Navigate to main dashboard
    await this.router.navigate(['/tabs/home'], { replaceUrl: true });
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
