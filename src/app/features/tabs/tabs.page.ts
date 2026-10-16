import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, cameraOutline, walletOutline, personOutline } from 'ionicons/icons';
import { ActionBarComponent } from '../../shared/components/action-bar/action-bar.component';
import { QuickLogModalComponent } from '../../shared/components/quick-log-modal/quick-log-modal.component';
import { HesitationModalComponent } from '../../shared/components/hesitation-modal/hesitation-modal.component';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
    CommonModule,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    ActionBarComponent
  ],
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss']
})
export class TabsPage implements OnInit {
  currentTab = 'home';
  showTabs = true;

  constructor(
    private modalCtrl: ModalController,
    private router: Router
  ) {
    addIcons({ homeOutline, cameraOutline, walletOutline, personOutline });
  }

  ngOnInit(): void {
    this.updateTabFromUrl(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateTabFromUrl(event.urlAfterRedirects || event.url);
      }
    });
  }

  onTabChange(event: { tab: string }): void {
    if (event && event.tab) {
      this.currentTab = event.tab;
    }
  }

  private updateTabFromUrl(url: string): void {
    const cleanPath = (url || '').split('?')[0].split('#')[0].replace(/\/+$/, '');

    // Secondary/detail routes where the bottom tab bar must be completely hidden
    // e.g.: /tabs/purchases, /tabs/expenses, /tabs/budget/category/:id
    const isSubPage =
      cleanPath.includes('/category') ||
      cleanPath.endsWith('/purchases') ||
      cleanPath.endsWith('/expenses') ||
      cleanPath.includes('/purchases/') ||
      cleanPath.includes('/expenses/');

    this.showTabs = !isSubPage;

    if (cleanPath.startsWith('/tabs/capture')) {
      this.currentTab = 'capture';
    } else if (cleanPath === '/tabs/budget') {
      this.currentTab = 'budget';
    } else if (cleanPath.startsWith('/tabs/profile')) {
      this.currentTab = 'profile';
    } else if (cleanPath === '/tabs/home' || cleanPath === '/tabs') {
      this.currentTab = 'home';
    } else {
      this.currentTab = '';
    }
  }

  async handleWantToBuy(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: HesitationModalComponent,
      cssClass: 'hesitation-modal-sheet'
    });
    await modal.present();
  }

  async handleQuickLog(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: QuickLogModalComponent,
      breakpoints: [0, 0.9, 1],
      initialBreakpoint: 0.9,
      cssClass: 'quick-log-sheet'
    });
    await modal.present();
  }
}
