import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonProgressBar,
  IonAvatar,
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
  ellipseOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { PognonChatModalComponent } from '../../shared/components/pognon-chat-modal/pognon-chat-modal.component';
import { BudgetFacade } from './facade/budget.facade';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { PurchasesFacade } from '../purchases/facade/purchases.facade';
import { CurrencyService } from '../../core/services/currency.service';
import {
  Category,
  CategoryEnvelopeView,
  getCategoryIcon,
  getCategoryColor
} from './domain/budget.model';

export { CategoryEnvelopeView } from './domain/budget.model';

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
    IonProgressBar,
    IonAvatar,
    IonIcon,
    IonModal,
    IonInput
  ],
  templateUrl: './budget.page.html',
  styleUrls: ['./budget.page.scss']
})
export class BudgetPage implements OnInit {
  private readonly router = inject(Router);
  public readonly budgetFacade = inject(BudgetFacade);
  public readonly expensesFacade = inject(ExpensesFacade);
  public readonly purchasesFacade = inject(PurchasesFacade);
  public readonly currencyService = inject(CurrencyService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  // Expose domain helpers to template
  readonly getCategoryIcon = getCategoryIcon;
  readonly getCategoryColor = getCategoryColor;

  // Reactive signals bound directly from facades (no local business computations)
  readonly envelopes = this.budgetFacade.envelopes;
  readonly categories = this.budgetFacade.categories;
  readonly coachAdvice = this.budgetFacade.coachAdvice;
  readonly consumption = this.budgetFacade.consumption;
  readonly isDiscoveryMode = this.budgetFacade.isDiscoveryMode;

  // Budget Configuration Modal Form State
  readonly isConfigModalOpen = signal(false);
  editBudgetMode: 'fixed' | 'discovery' = 'fixed';
  editTotalBudgetGhs: number = 600;
  editCycleStartDay: number = 1;
  editCategories: Category[] = [];

  constructor() {
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
      ellipseOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline
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
      this.purchasesFacade.load(),
      this.currencyService.initFromDb()
    ]);
  }

  /**
   * Navigates to the Category Detail Page showing all transactions and envelope status
   */
  goToCategoryDetail(env: CategoryEnvelopeView): void {
    this.router.navigate(['/tabs/budget/category', env.category.id]);
  }

  goToPurchases(): void {
    this.router.navigate(['/tabs/purchases']);
  }

  async openPognonChat(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PognonChatModalComponent,
      cssClass: 'pognon-chat-modal'
    });
    await modal.present();
  }

  // Configuration Modal Controls
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
    await this.budgetFacade.saveBudgetStrategy(
      this.editBudgetMode,
      this.editTotalBudgetGhs,
      this.editCycleStartDay,
      this.editCategories
    );

    this.closeBudgetConfigModal();
    await this.showToast('Budget strategy and envelopes updated successfully!', 'success');
  }

  // AI Proposal Modal - delegates calculation & adoption to BudgetFacade
  async openAiBudgetProposal(): Promise<void> {
    const suggestion = this.budgetFacade.getAiBudgetSuggestion();

    const alert = await this.alertCtrl.create({
      header: 'M. Pognon AI Proposal',
      subHeader: `Observation: ${suggestion.totalSpent.toFixed(2)} GHS over ${suggestion.daysElapsed} day(s)`,
      message: `Based on your real campus spending velocity, M. Pognon recommends a monthly allowance target of ${suggestion.suggestedBudget} GHS (~${this.currencyService.toXof(suggestion.suggestedBudget).toLocaleString()} XOF).\n\nWould you like to adopt this as your target monthly budget ceiling now?`,
      buttons: [
        { text: 'Keep Observing', role: 'cancel' },
        {
          text: `Adopt ${suggestion.suggestedBudget} GHS Ceiling`,
          handler: async () => {
            await this.budgetFacade.adoptAiSuggestedBudget(suggestion.suggestedBudget);
            await this.showToast(`Target budget of ${suggestion.suggestedBudget} GHS adopted!`, 'success');
          }
        }
      ]
    });
    await alert.present();
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
