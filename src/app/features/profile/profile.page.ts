import { Component, OnInit, OnDestroy } from '@angular/core';
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
  documentTextOutline,
  cloudOfflineOutline,
  mailOutline,
  keyOutline,
  logOutOutline,
  alertCircleOutline,
  arrowForwardOutline
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

export type SettingsModalType = 'none' | 'profile' | 'currencies' | 'budget' | 'link-account';

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
export class ProfilePage implements OnInit, OnDestroy {
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

  // Backup & Account Linking State
  isCloudSyncing = false;

  get isLinked(): boolean {
    return this.syncService.isLinked();
  }

  get linkedEmail(): string | null {
    return this.syncService.getUserEmail();
  }

  linkEmailInput = '';
  linkOtpInput = '';
  linkStep: 'email' | 'otp' = 'email';
  isLinking = false;
  linkCountdown = 0;
  private linkTimer: any = null;

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
      lockClosedOutline,
      cloudOfflineOutline,
      mailOutline,
      keyOutline,
      logOutOutline,
      alertCircleOutline,
      arrowForwardOutline
    });
  }

  ngOnInit(): void {
    this.loadProfileData();
  }

  ngOnDestroy(): void {
    this.clearLinkCountdown();
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
      this.showToast('Please enter your student name or nickname.', 'warning');
      return;
    }

    this.userProfile.updatedAt = new Date().toISOString();
    await this.profileFacade.saveUserProfile(this.userProfile);
    this.closeModal();
    await this.showToast('Student profile updated successfully.', 'success');
  }

  async saveCurrencies(): Promise<void> {
    if (this.monthlyBudget.exchangeRateXof <= 0) {
      this.showToast('Exchange rate must be greater than zero.', 'warning');
      return;
    }

    await this.currencyService.setCurrency(this.userProfile.primaryCurrency);
    await this.currencyService.setExchangeRate(this.monthlyBudget.exchangeRateXof);

    this.monthlyBudget.plannedDailyBudgetGhs = Math.round(this.monthlyBudget.totalBudgetGhs / 30);
    await this.budgetFacade.saveMonthlyBudget(this.monthlyBudget);

    this.closeModal();
    await this.showToast('Currencies and exchange rates saved.', 'success');
  }

  onBudgetModeChange(mode: string): void {
    const isDiscovery = mode === 'discovery';
    this.monthlyBudget.isDiscoveryMode = isDiscovery;
    if (isDiscovery) {
      this.monthlyBudget.totalBudgetGhs = 0;
    } else if (this.monthlyBudget.totalBudgetGhs <= 0) {
      this.monthlyBudget.totalBudgetGhs = 600;
    }
  }

  async saveBudget(): Promise<void> {
    const isDiscovery = this.monthlyBudget.isDiscoveryMode;
    if (!isDiscovery && this.monthlyBudget.totalBudgetGhs <= 0) {
      this.showToast('Monthly budget must be greater than zero.', 'warning');
      return;
    }

    const safeCycle = Math.min(28, Math.max(1, this.userProfile.cycleStartDay || 1));
    this.userProfile.cycleStartDay = safeCycle;
    this.userProfile.budgetMode = isDiscovery ? 'discovery' : 'fixed';
    await this.profileFacade.saveUserProfile(this.userProfile);

    this.monthlyBudget.cycleStartDay = safeCycle;
    this.monthlyBudget.plannedDailyBudgetGhs = isDiscovery ? 0 : Math.round(this.monthlyBudget.totalBudgetGhs / 30);
    await this.budgetFacade.saveMonthlyBudget(this.monthlyBudget);

    for (const cat of this.categories) {
      await this.budgetFacade.addCategory(cat);
    }

    this.closeModal();
    await this.showToast('Budget strategy and envelopes saved.', 'success');
  }

  // Cloudflare D1 & JSON Vault Backup
  async backupToCloud(): Promise<void> {
    this.isCloudSyncing = true;
    const result = await this.syncService.backupToCloud();
    this.isCloudSyncing = false;

    if (result.success) {
      await this.showToast('Data backed up to Cloud successfully!', 'success');
      const alert = await this.alertCtrl.create({
        header: 'Cloud Backup Complete',
        message: `Your ${result.stats?.expenses || 0} expense(s), ${result.stats?.purchases || 0} wishlist item(s), and settings are safely mirrored on Cloudflare D1.`,
        buttons: ['Done']
      });
      await alert.present();
    } else {
      await this.showToast(result.error || 'Backup failed. Please check network connection.', 'danger');
    }
  }

  async restoreFromCloud(): Promise<void> {
    const confirmAlert = await this.alertCtrl.create({
      header: 'Restore from Cloud?',
      message: 'This will load all data from Cloudflare D1 and refresh your device. Continue?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Restore',
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
              await this.showToast(`Restore complete: ${res.stats?.expenses || 0} expenses recovered.`, 'success');
            } else {
              await this.showToast(res.error || 'Failed to restore from Cloud.', 'danger');
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
    await this.showToast('JSON Vault downloaded! Keep this backup file in a safe place.', 'success');
  }

  async triggerFileRestore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const backupData = await this.exportService.readBackupFile(file);
      const confirmAlert = await this.alertCtrl.create({
        header: 'Restore from file?',
        message: `File: ${file.name}\nExpenses found: ${backupData.expenses?.length || 0}\nWishlist items found: ${backupData.purchases?.length || 0}\n\nDo you want to replace current data with this backup vault?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Restore Now',
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
              await this.showToast(`Vault restored successfully! ${stats.expenses} expenses loaded.`, 'success');
            }
          }
        ]
      });
      await confirmAlert.present();
    } catch (err: any) {
      await this.showToast(err.message || 'Invalid backup file format.', 'danger');
    } finally {
      input.value = '';
    }
  }

  async exportCsv(): Promise<void> {
    await this.expensesFacade.load();
    const expenses = this.expensesFacade.expenses();
    if (expenses.length === 0) {
      this.showToast('No recorded expenses found to export.', 'warning');
      return;
    }

    this.exportService.exportExpensesToCsv(expenses);
    this.showToast(`${expenses.length} expenses exported to CSV successfully!`, 'success');
  }

  async confirmResetData(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reset local database?',
      message: 'This will wipe all recorded expenses. Budget ceilings and categories will return to default presets. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
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
            this.showToast('Local database successfully reset.', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async openLinkAccountModal(): Promise<void> {
    if (this.isLinked) {
      const alert = await this.alertCtrl.create({
        header: 'Cloud Account Linked',
        subHeader: this.linkedEmail || '',
        message: 'Your account is connected to the server. Your expenses and budget can be synced automatically.',
        buttons: [
          {
            text: 'Backup Now',
            handler: () => {
              this.backupToCloud();
            }
          },
          {
            text: 'Disconnect Account',
            role: 'destructive',
            handler: () => {
              this.unlinkAccount();
            }
          },
          {
            text: 'Close',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
    } else {
      this.linkStep = 'email';
      this.linkEmailInput = this.userProfile.email || '';
      this.linkOtpInput = '';
      this.openModal('link-account');
    }
  }

  async sendLinkOtp(): Promise<void> {
    const email = this.linkEmailInput.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
      await this.showToast('Please enter a valid email address.', 'warning');
      return;
    }

    this.isLinking = true;
    const res = await this.syncService.sendOtp(email);
    this.isLinking = false;

    if (res.success) {
      this.linkStep = 'otp';
      this.startLinkCountdown(60);
      await this.showToast(res.message || '6-digit code sent to your email.', 'success');
    } else {
      await this.showToast(res.error || 'Error sending code. Please check your connection.', 'danger');
    }
  }

  async verifyLinkOtp(): Promise<void> {
    const code = this.linkOtpInput.trim();
    if (!code || code.length < 6) {
      await this.showToast('Please enter the 6-digit code received by email.', 'warning');
      return;
    }

    this.isLinking = true;
    const res = await this.syncService.verifyOtp(this.linkEmailInput.trim(), code);
    this.isLinking = false;

    if (res.success) {
      this.closeModal();
      this.clearLinkCountdown();

      // Update local profile with email & isLinked
      const updatedProfile: UserProfile = {
        ...this.userProfile,
        email: this.linkEmailInput.trim(),
        isLinked: true,
        updatedAt: new Date().toISOString()
      };
      await this.profileFacade.saveUserProfile(updatedProfile);
      this.userProfile = { ...updatedProfile };

      // Push current local data as initial cloud backup
      await this.syncService.backupToCloud();

      await this.showToast('Account linked successfully! Cloud sync is now active.', 'success');
    } else {
      await this.showToast(res.error || 'Invalid or expired verification code.', 'danger');
    }
  }

  async resendLinkOtp(): Promise<void> {
    if (this.linkCountdown > 0 || this.isLinking) return;
    await this.sendLinkOtp();
  }

  private startLinkCountdown(seconds: number): void {
    this.linkCountdown = seconds;
    this.clearLinkCountdown();
    this.linkTimer = setInterval(() => {
      if (this.linkCountdown > 0) {
        this.linkCountdown--;
      } else {
        this.clearLinkCountdown();
      }
    }, 1000);
  }

  private clearLinkCountdown(): void {
    if (this.linkTimer) {
      clearInterval(this.linkTimer);
      this.linkTimer = null;
    }
  }

  async unlinkAccount(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Disconnect Account?',
      message: 'Online synchronization will be disabled. All your local data will remain safe on this device.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: async () => {
            this.syncService.logout();
            const updatedProfile: UserProfile = {
              ...this.userProfile,
              isLinked: false,
              updatedAt: new Date().toISOString()
            };
            await this.profileFacade.saveUserProfile(updatedProfile);
            this.userProfile = { ...updatedProfile };
            await this.showToast('Account disconnected successfully.', 'success');
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
