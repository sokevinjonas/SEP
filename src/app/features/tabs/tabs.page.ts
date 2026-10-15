import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  ModalController,
  ToastController
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
export class TabsPage {
  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    addIcons({ homeOutline, cameraOutline, walletOutline, personOutline });
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
