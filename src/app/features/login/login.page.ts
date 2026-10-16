import { Component, OnInit, OnDestroy } from '@angular/core';
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
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
  AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  mailOutline,
  keyOutline,
  checkmarkCircleOutline,
  refreshOutline,
  cloudDownloadOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  lockClosedOutline
} from 'ionicons/icons';
import { SyncService } from '../../core/services/sync.service';
import { IdbService } from '../../core/db/idb.service';
import { ExportService } from '../../core/services/export.service';
import { ProfileFacade } from '../profile/facade/profile.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { PurchasesFacade } from '../purchases/facade/purchases.facade';

@Component({
  selector: 'app-login',
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
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit, OnDestroy {
  step: 'email' | 'otp' = 'email';
  email: string = '';
  otpCode: string = '';

  isLoading: boolean = false;
  isRestoringFile: boolean = false;
  countdown: number = 0;
  private countdownTimer: any = null;

  constructor(
    private router: Router,
    private syncService: SyncService,
    private idbService: IdbService,
    private exportService: ExportService,
    private profileFacade: ProfileFacade,
    private budgetFacade: BudgetFacade,
    private expensesFacade: ExpensesFacade,
    private purchasesFacade: PurchasesFacade,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      mailOutline,
      keyOutline,
      checkmarkCircleOutline,
      refreshOutline,
      cloudDownloadOutline,
      documentTextOutline,
      shieldCheckmarkOutline,
      lockClosedOutline
    });
  }

  ngOnInit(): void {
    const savedEmail = this.syncService.getUserEmail();
    if (savedEmail) {
      this.email = savedEmail;
    }
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  goBack(): void {
    if (this.step === 'otp') {
      this.step = 'email';
      this.otpCode = '';
    } else {
      this.router.navigate(['/register']);
    }
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  async sendOtp(): Promise<void> {
    const trimmedEmail = this.email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      await this.showToast('Please enter a valid email address.', 'warning');
      return;
    }

    this.isLoading = true;
    const res = await this.syncService.sendOtp(trimmedEmail);
    this.isLoading = false;

    if (res.success) {
      this.step = 'otp';
      this.startCountdown(60);
      await this.showToast(res.message || 'Verification code sent to your email address.', 'success');
    } else {
      await this.showToast(res.error || 'Failed to send code. Please check your network connection.', 'danger');
    }
  }

  async verifyOtp(): Promise<void> {
    const trimmedCode = this.otpCode.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      await this.showToast('Please enter the 6-digit code received by email.', 'warning');
      return;
    }

    this.isLoading = true;
    const res = await this.syncService.verifyOtp(this.email.trim(), trimmedCode);
    this.isLoading = false;

    if (!res.success) {
      await this.showToast(res.error || 'Invalid or expired verification code.', 'danger');
      return;
    }

    // Handle backup restore if available
    let restoredExpenses = 0;
    if (res.hasBackup && res.backupData) {
      try {
        const stats = await this.idbService.restoreAllData(res.backupData);
        restoredExpenses = stats.expenses;
      } catch (e) {
        console.warn('[LoginPage] Cloud backup restore error:', e);
      }
    } else {
      // Ensure profile has email and is onboarded
      const current = await this.profileFacade.load();
      await this.profileFacade.saveUserProfile({
        ...current,
        name: current.name || this.email.split('@')[0],
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString()
      });
    }

    // Refresh facades in memory
    await Promise.all([
      this.profileFacade.load(),
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.purchasesFacade.load()
    ]);

    const welcomeMsg = res.hasBackup
      ? `Welcome back! Your campus data has been synced (${restoredExpenses} expenses).`
      : 'Sign in successful! Welcome to Student Savings.';
    await this.showToast(welcomeMsg, 'success');

    await this.router.navigate(['/tabs/home'], { replaceUrl: true });
  }

  async resendOtp(): Promise<void> {
    if (this.countdown > 0 || this.isLoading) return;
    await this.sendOtp();
  }

  private startCountdown(seconds: number): void {
    this.countdown = seconds;
    this.clearCountdown();
    this.countdownTimer = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.clearCountdown();
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  async triggerFileRestore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const backupData = await this.exportService.readBackupFile(file);
      const alert = await this.alertCtrl.create({
        header: 'Restore Backup File?',
        message: `File: ${file.name}\n${backupData.expenses?.length || 0} expenses detected.\nDo you want to restore this data?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Restore',
            handler: async () => {
              this.isRestoringFile = true;
              const stats = await this.idbService.restoreAllData(backupData);
              await Promise.all([
                this.profileFacade.load(),
                this.budgetFacade.load(),
                this.expensesFacade.load(),
                this.purchasesFacade.load()
              ]);
              this.isRestoringFile = false;
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


  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3200,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
