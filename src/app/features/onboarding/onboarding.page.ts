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
  IonSegment,
  IonSegmentButton,
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
  shieldCheckmarkOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../core/db/database.service';
import { CurrencyService } from '../../core/services/currency.service';
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
    IonSegment,
    IonSegmentButton
  ],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss']
})
export class OnboardingPage implements OnInit {
  userName = 'Jonas';
  userCity = 'Accra';
  userCampus = 'Campus Legon';
  primaryCurrency: 'GHS' | 'XOF' = 'GHS';
  exchangeRate = 42;
  monthlyBudgetGhs = 600;

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
      shieldCheckmarkOutline,
      checkmarkCircleOutline
    });
  }

  async ngOnInit() {
    const profile = await this.db.getUserProfile();
    this.userName = profile.name || 'Jonas';
    this.userCity = profile.city || 'Accra';
    this.userCampus = profile.campus || 'Campus Legon';
    this.primaryCurrency = profile.primaryCurrency || 'GHS';

    const budget = await this.db.getMonthlyBudget();
    this.exchangeRate = budget.exchangeRateXof || 42;
    this.monthlyBudgetGhs = budget.totalBudgetGhs || 600;
  }

  async completeOnboarding() {
    if (!this.userName.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Veuillez renseigner votre prénom ou pseudo.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (this.exchangeRate <= 0 || this.monthlyBudgetGhs <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Le budget et le taux de change doivent être supérieurs à zéro.',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    // 1. Save User Profile to DB
    const profile: UserProfile = {
      id: 'current_user',
      name: this.userName.trim(),
      city: this.userCity.trim() || 'Accra',
      campus: this.userCampus.trim() || 'Campus Legon',
      primaryCurrency: this.primaryCurrency,
      hasCompletedOnboarding: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.db.saveUserProfile(profile);

    // 2. Save Budget & Exchange Rate to DB
    const budget = await this.db.getMonthlyBudget();
    budget.totalBudgetGhs = this.monthlyBudgetGhs;
    budget.exchangeRateXof = this.exchangeRate;
    budget.plannedDailyBudgetGhs = Math.round(this.monthlyBudgetGhs / 30);
    await this.db.saveMonthlyBudget(budget);

    // 3. Update Currency Service
    this.currencyService.setCurrency(this.primaryCurrency);
    await this.currencyService.setExchangeRate(this.exchangeRate);

    const toast = await this.toastCtrl.create({
      message: `Bienvenue ${profile.name} ! Votre cockpit budgétaire est prêt.`,
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    // Navigate to Home
    await this.router.navigate(['/home'], { replaceUrl: true });
  }
}
