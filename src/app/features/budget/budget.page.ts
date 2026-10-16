import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonBadge,
  IonProgressBar,
  IonAvatar,
  IonCard,
  IonCardContent,
  IonIcon,
  IonModal,
  IonInput,
  ModalController,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  chatbubblesOutline,
  sparklesOutline,
  optionsOutline,
  saveOutline,
  closeOutline,
  calendarOutline,
  cashOutline,
  checkmarkCircle,
  ellipseOutline
} from 'ionicons/icons';
import { PognonChatModalComponent } from '../../shared/components/pognon-chat-modal/pognon-chat-modal.component';
import { BudgetFacade } from './facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { ProfileFacade } from '../profile/facade/profile.facade';
import { CurrencyService } from '../../core/services/currency.service';
import { BudgetCalculatorService } from '../../core/services/budget-calculator.service';
import { Category, MonthlyBudget } from '../../core/models/financial.models';

export { CategoryEnvelopeView } from './domain/budget.model';
import { CategoryEnvelopeView } from './domain/budget.model';

@Component({
  selector: 'app-budget',
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
    IonItem,
    IonBadge,
    IonProgressBar,
    IonAvatar,
    IonCard,
    IonCardContent,
    IonIcon,
    IonModal,
    IonInput
  ],
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss']
})
export class BudgetPage implements OnInit {
  // Reactive Signals from Facades
  readonly envelopes = this.budgetFacade.envelopes;
  readonly categories = this.budgetFacade.categories;
  readonly totalSpentGhs = this.expensesFacade.currentMonthTotalSpent;
  readonly totalBudgetAllocatedGhs = this.budgetFacade.totalBudgetAllocatedGhs;
  readonly totalBudgetCeilingGhs = this.budgetFacade.totalBudgetCeilingGhs;
  readonly plannedDailyBudgetGhs = this.budgetFacade.plannedDailyBudgetGhs;
  readonly isDiscoveryMode = this.budgetFacade.isDiscoveryMode;
  readonly cycleStartDay = this.budgetFacade.cycleStartDay;
  readonly consumption = this.budgetFacade.consumption;
  readonly budgetDaysInfo = this.budgetFacade.budgetDaysInfo;
  readonly userProfile = this.profileFacade.userProfile;

  // Budget Configuration Modal State
  readonly isConfigModalOpen = signal(false);
  editBudgetMode: 'fixed' | 'discovery' = 'fixed';
  editTotalBudgetGhs: number = 600;
  editCycleStartDay: number = 1;
  editCategories: Category[] = [];

  // Dynamic coaching advice quote based on current financial health
  readonly coachAdvice = computed(() => {
    const isDisc = this.isDiscoveryMode();
    if (isDisc) {
      return {
        badge: 'Discovery Observation',
        quote: 'Log every single campus expense! I am analyzing your real spending velocity to propose your ideal monthly budget.',
        status: 'safe' as const
      };
    }

    const status = this.consumption().status;
    if (status === 'safe') {
      return {
        badge: 'Runway Protected',
        quote: 'Disciplined student! Your envelopes are healthy. Keep resisting impulse spending and your fund will thrive!',
        status: 'safe' as const
      };
    } else if (status === 'warning') {
      return {
        badge: 'Envelopes Running Warm',
        quote: 'Some envelopes have exceeded 70%. Prioritize campus dining over outside restaurants this week!',
        status: 'warning' as const
      };
    } else {
      return {
        badge: 'Ceiling Alert',
        quote: `Monthly allowance nearly exhausted! Freeze discretionary purchases until day ${this.cycleStartDay() || 1}.`,
        status: 'danger' as const
      };
    }
  });

  constructor(
    public readonly budgetFacade: BudgetFacade,
    public readonly expensesFacade: ExpensesFacade,
    public readonly profileFacade: ProfileFacade,
    public readonly currencyService: CurrencyService,
    public readonly budgetCalculator: BudgetCalculatorService,
    private readonly modalCtrl: ModalController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController
  ) {
    addIcons({
      walletOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      chatbubblesOutline,
      sparklesOutline,
      optionsOutline,
      saveOutline,
      closeOutline,
      calendarOutline,
      cashOutline,
      checkmarkCircle,
      ellipseOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    await Promise.all([
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.profileFacade.load(),
      this.currencyService.initFromDb()
    ]);
  }

  async openPognonChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PognonChatModalComponent,
      cssClass: 'pognon-chat-modal'
    });
    await modal.present();
  }

  // Quick edit of single envelope allocation by tapping card
  async openEditEnvelopeAllocation(env: CategoryEnvelopeView): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Adjust ${env.category.name}`,
      subHeader: `Current allocation: ${env.allocatedGhs} GHS`,
      inputs: [
        {
          name: 'allocation',
          type: 'number',
          placeholder: 'Monthly allocation in GHS',
          value: env.allocatedGhs,
          min: 0,
          max: 50000
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save Envelope',
          handler: async (data) => {
            const val = parseFloat(data.allocation);
            if (isNaN(val) || val < 0) {
              await this.showToast('Please enter a valid amount.', 'warning');
              return false;
            }
            await this.budgetFacade.addCategory({
              ...env.category,
              monthlyAllocationGhs: val
            });
            await this.showToast(`${env.category.name} envelope updated to ${val} GHS.`, 'success');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // Open Full Budget & Envelopes Configuration Modal
  openBudgetConfigModal(): void {
    const isDisc = this.isDiscoveryMode();
    const current = this.budgetFacade.monthlyBudget();

    this.editBudgetMode = isDisc ? 'discovery' : 'fixed';
    this.editTotalBudgetGhs = current?.totalBudgetGhs || 600;
    this.editCycleStartDay = current?.cycleStartDay || 1;
    this.editCategories = this.categories().map(c => ({ ...c }));

    this.isConfigModalOpen.set(true);
  }

  closeBudgetConfigModal(): void {
    this.isConfigModalOpen.set(false);
  }

  selectCyclePreset(day: number): void {
    this.editCycleStartDay = Math.min(28, Math.max(1, day));
  }

  get computedTotalEnvelopes(): number {
    return this.editCategories.reduce((sum, c) => sum + (Number(c.monthlyAllocationGhs) || 0), 0);
  }

  async saveBudgetConfig(): Promise<void> {
    const isDisc = this.editBudgetMode === 'discovery';
    const ceiling = isDisc ? 0 : Math.max(10, Number(this.editTotalBudgetGhs) || 0);
    const cycleDay = Math.min(28, Math.max(1, Number(this.editCycleStartDay) || 1));

    const current = this.budgetFacade.monthlyBudget();
    const updatedBudget: MonthlyBudget = {
      id: current?.id || 'current',
      monthYear: current?.monthYear || new Date().toISOString().substring(0, 7),
      totalBudgetGhs: ceiling,
      plannedDailyBudgetGhs: isDisc ? 0 : Math.round(ceiling / 30),
      exchangeRateXof: current?.exchangeRateXof || 42.0,
      isDiscoveryMode: isDisc,
      cycleStartDay: cycleDay
    };

    await this.budgetFacade.saveMonthlyBudget(updatedBudget);

    // Save updated category envelope allocations
    for (const cat of this.editCategories) {
      await this.budgetFacade.addCategory({
        ...cat,
        monthlyAllocationGhs: Number(cat.monthlyAllocationGhs) || 0
      });
    }

    // Synchronize with user profile
    const profile = this.userProfile();
    if (profile) {
      await this.profileFacade.saveUserProfile({
        ...profile,
        budgetMode: this.editBudgetMode,
        cycleStartDay: cycleDay,
        updatedAt: new Date().toISOString()
      });
    }

    this.closeBudgetConfigModal();
    await this.showToast('Budget strategy and envelopes updated successfully!', 'success');
  }

  // AI Proposal Modal
  async openAiBudgetProposal(): Promise<void> {
    const totalSpent = this.consumption().totalSpentGhs;
    const daysElapsed = this.consumption().cycleDaysElapsed || 1;
    const daysTotal = this.consumption().cycleDaysTotal || 30;
    const cycleDay = this.consumption().cycleStartDay || 1;

    let suggestedBudget = 600;
    if (totalSpent > 0 && daysElapsed > 0) {
      const projected = (totalSpent / daysElapsed) * daysTotal;
      suggestedBudget = Math.max(100, Math.round(projected / 50) * 50);
    }

    const alert = await this.alertCtrl.create({
      header: 'M. Pognon AI Proposal',
      subHeader: `Observation: ${totalSpent.toFixed(2)} GHS over ${daysElapsed} day(s)`,
      message: `Based on your real campus spending velocity, M. Pognon recommends a monthly allowance target of ${suggestedBudget} GHS (~${this.currencyService.toXof(suggestedBudget).toLocaleString()} XOF).\n\nWould you like to adopt this as your target monthly budget ceiling now?`,
      buttons: [
        { text: 'Keep Observing', role: 'cancel' },
        {
          text: `Adopt ${suggestedBudget} GHS Ceiling`,
          handler: async () => {
            const currentBudget = this.budgetFacade.monthlyBudget();
            const updatedBudget: MonthlyBudget = {
              id: currentBudget?.id || 'current',
              monthYear: currentBudget?.monthYear || new Date().toISOString().substring(0, 7),
              totalBudgetGhs: suggestedBudget,
              exchangeRateXof: currentBudget?.exchangeRateXof || 42.0,
              plannedDailyBudgetGhs: Math.round(suggestedBudget / 30),
              isDiscoveryMode: false,
              cycleStartDay: cycleDay
            };
            await this.budgetFacade.saveMonthlyBudget(updatedBudget);

            const profile = this.userProfile();
            if (profile) {
              await this.profileFacade.saveUserProfile({
                ...profile,
                budgetMode: 'fixed',
                cycleStartDay: cycleDay,
                updatedAt: new Date().toISOString()
              });
            }

            await this.showToast(`Target budget of ${suggestedBudget} GHS adopted!`, 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  getCategoryIcon(catId: string): string {
    switch (catId) {
      case 'cat-food': return 'restaurant-outline';
      case 'cat-transport': return 'bus-outline';
      case 'cat-books': return 'book-outline';
      case 'cat-social': return 'people-outline';
      case 'cat-utilities': return 'flash-outline';
      default: return 'ellipsis-horizontal-circle-outline';
    }
  }

  getCategoryColor(catId: string): string {
    switch (catId) {
      case 'cat-food': return '#E67E22';
      case 'cat-transport': return '#2980B9';
      case 'cat-books': return '#27AE60';
      case 'cat-social': return '#8E44AD';
      case 'cat-utilities': return '#D35400';
      default: return '#714B67';
    }
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
