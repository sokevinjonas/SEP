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
import { homeOutline, cameraOutline, walletOutline } from 'ionicons/icons';
import { ActionBarComponent } from '../../shared/components/action-bar/action-bar.component';
import { QuickLogModalComponent } from '../../shared/components/quick-log-modal/quick-log-modal.component';

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
    addIcons({ homeOutline, cameraOutline, walletOutline });
  }

  async handleWantToBuy(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: 'Reflection Pause (Anti-Impulse): Calculating budget days impact...',
      duration: 2200,
      color: 'tertiary',
      position: 'top',
    });
    await toast.present();
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
