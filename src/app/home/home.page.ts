import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonProgressBar,
  IonChip,
  IonBadge,
  IonAvatar,
  IonLabel,
  IonNote,
  IonList,
  IonListHeader,
  IonItem,
  IonIcon,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  optionsOutline,
  shieldCheckmarkOutline,
  timeOutline,
  busOutline,
  restaurantOutline,
  bookOutline,
  trendingUpOutline,
  walletOutline,
  peopleOutline,
  flashOutline,
  ellipsisHorizontalCircleOutline,
  trophyOutline,
  chatbubblesOutline,
  sparklesOutline
} from 'ionicons/icons';
import { ExpensesFacade } from '../features/expenses/facade/expenses.facade';
import { PurchasesFacade } from '../features/purchases/facade/purchases.facade';
import { BudgetFacade } from '../features/budget/facade/budget.facade';
import { ProfileFacade } from '../features/profile/facade/profile.facade';
import { CurrencyService } from '../core/services/currency.service';
import { CurrencyPillComponent } from '../shared/components/currency-pill/currency-pill.component';
import { BreathingBadgeComponent } from '../shared/components/breathing-badge/breathing-badge.component';
import { PognonChatModalComponent } from '../shared/components/pognon-chat-modal/pognon-chat-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    IonProgressBar,
    IonChip,
    IonBadge,
    IonAvatar,
    IonLabel,
    IonNote,
    IonList,
    IonListHeader,
    IonItem,
    IonIcon,
    CurrencyPillComponent,
    BreathingBadgeComponent
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  // Reactive Signals from Facades - drive UI instantly without zone.js or clicks
  readonly userProfile = this.profileFacade.userProfile;
  readonly consumption = this.budgetFacade.consumption;
  readonly budgetDaysInfo = this.budgetFacade.budgetDaysInfo;
  readonly avoidedGhs = this.purchasesFacade.avoidedTotal;
  readonly recentExpenses = this.expensesFacade.recentExpenses;

  isCelebratingAvoided = false;

  constructor(
    public readonly expensesFacade: ExpensesFacade,
    public readonly purchasesFacade: PurchasesFacade,
    public readonly budgetFacade: BudgetFacade,
    public readonly profileFacade: ProfileFacade,
    public readonly currencyService: CurrencyService,
    private readonly router: Router,
    private readonly modalCtrl: ModalController
  ) {
    addIcons({
      optionsOutline,
      shieldCheckmarkOutline,
      timeOutline,
      busOutline,
      restaurantOutline,
      bookOutline,
      trendingUpOutline,
      walletOutline,
      peopleOutline,
      flashOutline,
      ellipsisHorizontalCircleOutline,
      trophyOutline,
      chatbubblesOutline,
      sparklesOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.refreshAllData();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.refreshAllData();

    if (sessionStorage.getItem('sep_celebrate_avoided') === 'true') {
      sessionStorage.removeItem('sep_celebrate_avoided');
      this.isCelebratingAvoided = true;
      setTimeout(() => {
        this.isCelebratingAvoided = false;
      }, 4000);
    }
  }

  async refreshAllData(): Promise<void> {
    await Promise.all([
      this.profileFacade.load(),
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.purchasesFacade.load(),
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

  getCategoryIcon(iconName: string): string {
    return iconName || 'ellipsis-horizontal-circle-outline';
  }

  openSettings(): void {
    this.router.navigate(['/tabs/profile']);
  }
}
