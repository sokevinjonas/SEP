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
  IonSpinner,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  personOutline,
  globeOutline,
  businessOutline,
  schoolOutline,
  walletOutline,
  shieldCheckmarkOutline,
  refreshOutline,
  cashOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../core/db/database.service';
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
    IonSpinner
  ],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage implements OnInit {
  readonly Math = Math;

  userName = '';
  selectedCountry = 'Ghana';
  selectedCity = 'Accra';
  campus = 'University of Ghana (Legon)';

  countries: CountryItem[] = [];
  cities: string[] = [];
  suggestedCampuses: string[] = [];

  isLoadingCountries = false;
  isLoadingCities = false;

  // Financial engine
  primaryCurrency: CurrencyCode = 'GHS';
  secondaryCurrency: CurrencyCode = 'XOF';
  exchangeRate = 42.0;
  monthlyBudget = 600;

  isFetchingLiveRate = false;
  liveRateInfo: LiveRateInfo | null = null;
  rateStatusText = '';

  constructor(
    private db: DatabaseService,
    private currencyService: CurrencyService,
    private locationService: LocationService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({
      arrowBackOutline,
      personOutline,
      globeOutline,
      businessOutline,
      schoolOutline,
      walletOutline,
      shieldCheckmarkOutline,
      refreshOutline,
      cashOutline,
      checkmarkCircleOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCountries();
    await this.onCountryChanged(this.selectedCountry);
    this.fetchLiveRate();
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

  goBack(): void {
    this.router.navigate(['/onboarding']);
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

    if (this.monthlyBudget <= 0 || this.exchangeRate <= 0) {
      this.showToast('Budget ceiling and exchange rate must be greater than zero.', 'warning');
      return;
    }

    // 1. Save User Profile to IndexedDB
    const profile: UserProfile = {
      id: 'current_user',
      name: this.userName.trim(),
      country: this.selectedCountry,
      city: this.selectedCity,
      campus: this.campus.trim(),
      primaryCurrency: this.primaryCurrency,
      hasCompletedOnboarding: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.saveUserProfile(profile);

    // 2. Save Monthly Budget & Rates to IndexedDB
    const budget = await this.db.getMonthlyBudget();
    budget.totalBudgetGhs = this.monthlyBudget;
    budget.exchangeRateXof = this.exchangeRate;
    budget.plannedDailyBudgetGhs = Math.round(this.monthlyBudget / 30);
    await this.db.saveMonthlyBudget(budget);

    // 3. Update Currency Service
    await this.currencyService.setCurrency(this.primaryCurrency);
    await this.currencyService.setSecondaryCurrency(this.secondaryCurrency);
    await this.currencyService.setExchangeRate(this.exchangeRate);

    await this.showToast(`Welcome, ${profile.name}! Your campus vault is ready.`, 'success');

    // 4. Navigate to main dashboard
    await this.router.navigate(['/home'], { replaceUrl: true });
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
