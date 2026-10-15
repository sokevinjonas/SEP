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
  IonButton,
  IonIcon,
  IonAvatar,
  IonChip,
  IonProgressBar,
  IonSpinner,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  walletOutline,
  personOutline,
  schoolOutline,
  globeOutline,
  arrowForwardOutline,
  arrowBackOutline,
  shieldCheckmarkOutline,
  checkmarkCircleOutline,
  refreshOutline,
  flashOutline,
  timeOutline,
  cashOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../core/db/database.service';
import { CurrencyService, CurrencyCode, LiveRateInfo } from '../../core/services/currency.service';
import { UserProfile, MonthlyBudget } from '../../core/models/financial.models';

@Component({
  selector: 'app-onboarding',
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
    IonButton,
    IonIcon,
    IonAvatar,
    IonChip,
    IonProgressBar,
    IonSpinner
  ],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss']
})
export class OnboardingPage implements OnInit {
  currentStep = 1; // 1: Welcome, 2: Student Identity, 3: Financial Engine

  // Step 2: Student Identity
  userName = 'Jonas';
  userCity = 'Accra';
  isCustomCity = false;
  userCampus = 'University of Ghana (Legon)';
  isCustomCampus = false;

  readonly popularCities = [
    'Accra',
    'Kumasi',
    'Cape Coast',
    'Lomé',
    'Cotonou',
    'Abidjan',
    'Dakar',
    'Lagos'
  ];

  readonly popularCampuses = [
    'University of Ghana (Legon)',
    'KNUST (Kumasi)',
    'GIMPA',
    'Ashesi University',
    'UPSA',
    'University of Cape Coast'
  ];

  // Step 3: Currencies & Financial Engine
  primaryCurrency: CurrencyCode = 'GHS';
  secondaryCurrency: CurrencyCode = 'XOF';
  exchangeRate = 42.0;
  monthlyBudgetGhs = 600;

  readonly supportedCurrencies = [
    { code: 'GHS', label: 'Ghana Cedi (GHS)', symbol: 'GH₵' },
    { code: 'XOF', label: 'Franc CFA (XOF)', symbol: 'FCFA' },
    { code: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { code: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { code: 'NGN', label: 'Naira (NGN)', symbol: '₦' }
  ];

  isFetchingLiveRate = false;
  liveRateInfo: LiveRateInfo | null = null;
  rateFetchStatusMessage: string | null = null;

  constructor(
    private db: DatabaseService,
    private currencyService: CurrencyService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({
      sparklesOutline,
      walletOutline,
      personOutline,
      schoolOutline,
      globeOutline,
      arrowForwardOutline,
      arrowBackOutline,
      shieldCheckmarkOutline,
      checkmarkCircleOutline,
      refreshOutline,
      flashOutline,
      timeOutline,
      cashOutline,
      checkmarkOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const profile = await this.db.getUserProfile();
    if (profile.name) this.userName = profile.name;
    if (profile.city) this.userCity = profile.city;
    if (profile.campus) this.userCampus = profile.campus;
    if (profile.primaryCurrency) this.primaryCurrency = profile.primaryCurrency;

    const budget = await this.db.getMonthlyBudget();
    if (budget.exchangeRateXof) this.exchangeRate = budget.exchangeRateXof;
    if (budget.totalBudgetGhs) this.monthlyBudgetGhs = budget.totalBudgetGhs;
  }

  // Navigation between steps
  goToStep(step: number): void {
    if (step === 2 && this.currentStep === 1) {
      this.currentStep = 2;
      return;
    }

    if (step === 3 && this.currentStep === 2) {
      if (!this.userName.trim()) {
        this.showToast('Please provide your name or nickname to continue.', 'warning');
        return;
      }
      this.currentStep = 3;
      // Auto-fetch live market rate when landing on step 3
      this.fetchLiveExchangeRate();
      return;
    }

    this.currentStep = step;
  }

  selectCity(city: string): void {
    this.userCity = city;
    this.isCustomCity = false;
  }

  enableCustomCity(): void {
    this.isCustomCity = true;
    if (this.popularCities.includes(this.userCity)) {
      this.userCity = '';
    }
  }

  selectCampus(campus: string): void {
    this.userCampus = campus;
    this.isCustomCampus = false;
  }

  enableCustomCampus(): void {
    this.isCustomCampus = true;
    if (this.popularCampuses.includes(this.userCampus)) {
      this.userCampus = '';
    }
  }

  selectPrimaryCurrency(code: string): void {
    this.primaryCurrency = code;
    // Ensure secondary currency differs from primary
    if (this.primaryCurrency === this.secondaryCurrency) {
      this.secondaryCurrency = code === 'GHS' ? 'XOF' : 'GHS';
    }
    this.fetchLiveExchangeRate();
  }

  selectSecondaryCurrency(code: string): void {
    if (code === this.primaryCurrency) return;
    this.secondaryCurrency = code;
    this.fetchLiveExchangeRate();
  }

  async fetchLiveExchangeRate(): Promise<void> {
    this.isFetchingLiveRate = true;
    this.rateFetchStatusMessage = 'Fetching live market rate...';

    const result = await this.currencyService.fetchLiveRate(this.primaryCurrency, this.secondaryCurrency);
    this.isFetchingLiveRate = false;

    if (result) {
      this.liveRateInfo = result;
      this.exchangeRate = result.rate;
      this.rateFetchStatusMessage = `Market Rate: 1 ${result.base} = ${result.rate} ${result.target}`;
    } else {
      this.rateFetchStatusMessage = `Using benchmark rate (1 ${this.primaryCurrency} = ${this.exchangeRate} ${this.secondaryCurrency})`;
    }
  }

  get dailyAllowance(): number {
    return this.monthlyBudgetGhs > 0 ? parseFloat((this.monthlyBudgetGhs / 30).toFixed(2)) : 0;
  }

  get dailyAllowanceSecondary(): number {
    return Math.round(this.dailyAllowance * this.exchangeRate);
  }

  get campusMealEquivalent(): number {
    return Math.round(this.monthlyBudgetGhs / 15);
  }

  async completeOnboarding(): Promise<void> {
    if (!this.userName.trim()) {
      this.showToast('Please provide your name or nickname.', 'warning');
      this.currentStep = 2;
      return;
    }

    if (this.exchangeRate <= 0 || this.monthlyBudgetGhs <= 0) {
      this.showToast('Budget ceiling and exchange rate must be greater than zero.', 'warning');
      return;
    }

    // 1. Save User Profile to IndexedDB
    const profile: UserProfile = {
      id: 'current_user',
      name: this.userName.trim(),
      city: this.userCity.trim() || 'Accra',
      campus: this.userCampus.trim() || 'Legon Campus',
      primaryCurrency: this.primaryCurrency as any,
      hasCompletedOnboarding: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.saveUserProfile(profile);

    // 2. Save Budget & Exchange Rate to IndexedDB
    const budget = await this.db.getMonthlyBudget();
    budget.totalBudgetGhs = this.monthlyBudgetGhs;
    budget.exchangeRateXof = this.exchangeRate;
    budget.plannedDailyBudgetGhs = Math.round(this.monthlyBudgetGhs / 30);
    await this.db.saveMonthlyBudget(budget);

    // 3. Update Currency Service state
    await this.currencyService.setCurrency(this.primaryCurrency);
    await this.currencyService.setSecondaryCurrency(this.secondaryCurrency);
    await this.currencyService.setExchangeRate(this.exchangeRate);

    await this.showToast(`Welcome, ${profile.name}! Your student vault is now active.`, 'success');

    // Navigate to Home dashboard
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
