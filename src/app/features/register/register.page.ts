import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCardHeader,
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
  logInOutline,
  sparklesOutline,
  compassOutline,
  calendarOutline,
  helpCircleOutline,
  checkmarkOutline,
  timeOutline
} from 'ionicons/icons';
import { ProfileFacade } from '../profile/facade/profile.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { PurchasesFacade } from '../purchases/facade/purchases.facade';
import { CurrencyService, CurrencyCode, LiveRateInfo } from '../../core/services/currency.service';
import { LocationService, CountryItem } from '../../core/services/location.service';
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
    IonCardHeader,
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
  campus = '';

  countries: CountryItem[] = [];
  cities: string[] = [];
  suggestedCampuses: string[] = [];

  isLoadingCountries = false;
  isLoadingCities = false;

  // Financial engine & Budget strategy
  budgetMode: 'fixed' | 'discovery' = 'discovery';
  cycleStartDay = 1;
  customCycleInput = 1;
  showCustomCyclePicker = false;

  primaryCurrency: CurrencyCode = 'GHS';
  secondaryCurrency: CurrencyCode = 'XOF';
  exchangeRate = 42.0;
  monthlyBudget = 0;

  isFetchingLiveRate = false;
  liveRateInfo: LiveRateInfo | null = null;
  rateStatusText = '';

  constructor(
    private profileFacade: ProfileFacade,
    private budgetFacade: BudgetFacade,
    private expensesFacade: ExpensesFacade,
    private purchasesFacade: PurchasesFacade,
    private currencyService: CurrencyService,
    private locationService: LocationService,
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
      logInOutline,
      sparklesOutline,
      compassOutline,
      calendarOutline,
      helpCircleOutline,
      checkmarkOutline,
      timeOutline
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  async ngOnInit(): Promise<void> {
    // 1. Instant offline-first initialization
    this.countries = this.locationService.getInitialCountries();
    this.cities = await this.locationService.getCitiesForCountry(this.selectedCountry);
    this.suggestedCampuses = this.locationService.getCampusesForCountry(this.selectedCountry);
    this.fetchLiveRate();

    // 2. Non-blocking background enrich
    this.loadCountries();
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
    const list = await this.locationService.getCountries();
    if (list && list.length > 0) {
      this.countries = list;
    }
  }

  async onCountryChanged(countryName: string): Promise<void> {
    if (!countryName) return;

    this.selectedCountry = countryName;
    this.isLoadingCities = true;

    // 1. Fetch cities for selected country
    const newCities = await this.locationService.getCitiesForCountry(countryName);
    this.cities = newCities;
    this.isLoadingCities = false;

    // Pick first city if current city not in list or empty
    if (this.cities.length > 0 && (!this.selectedCity || !this.cities.includes(this.selectedCity))) {
      this.selectedCity = this.cities[0];
    }

    // 2. Load campus suggestions for this country
    this.suggestedCampuses = this.locationService.getCampusesForCountry(countryName);
    // Only pre-fill campus if currently empty or if it was a default placeholder
    if (this.suggestedCampuses.length > 0 && !this.campus.trim()) {
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
    if (city && city.trim()) {
      this.selectedCity = city;
    }
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

    if (this.exchangeRate <= 0) {
      this.showToast('Exchange rate must be greater than zero.', 'warning');
      return;
    }

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
      budgetMode: 'discovery',
      discoveryCompleted: false,
      cycleStartDay: safeCycleDay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.profileFacade.saveUserProfile(profile);

    // 2. Save Monthly Budget & Rates via BudgetFacade
    await this.budgetFacade.load();
    const existingBudget = this.budgetFacade.monthlyBudget();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budget: MonthlyBudget = {
      id: existingBudget?.id || currentMonthKey,
      monthYear: existingBudget?.monthYear || currentMonthKey,
      totalBudgetGhs: 0,
      exchangeRateXof: this.exchangeRate,
      plannedDailyBudgetGhs: 0,
      isDiscoveryMode: true,
      discoveryCompleted: false,
      cycleStartDay: safeCycleDay
    };
    await this.budgetFacade.saveMonthlyBudget(budget);

    // 3. Update Currency Service
    await this.currencyService.setCurrency(this.primaryCurrency);
    await this.currencyService.setSecondaryCurrency(this.secondaryCurrency);
    await this.currencyService.setExchangeRate(this.exchangeRate);

    const welcomeMsg = `Welcome, ${profile.name}! Discovery Mode activated. Mr. Pognon will observe your campus expenses until day ${safeCycleDay}.`;
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
