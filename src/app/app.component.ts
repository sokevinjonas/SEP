import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonApp,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  ModalController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, cameraOutline, walletOutline } from 'ionicons/icons';
import { ActionBarComponent } from './shared/components/action-bar/action-bar.component';
import { QuickLogModalComponent } from './shared/components/quick-log-modal/quick-log-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    ActionBarComponent
  ],
})
export class AppComponent {
  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    addIcons({ homeOutline, cameraOutline, walletOutline });
  }

  async handleWantToBuy() {
    const toast = await this.toastCtrl.create({
      message: 'Pause Réflexion (Anti-Pulsion) : Calcul des jours de budget...',
      duration: 2000,
      color: 'tertiary',
      position: 'top',
    });
    await toast.present();
  }

  async handleQuickLog() {
    const modal = await this.modalCtrl.create({
      component: QuickLogModalComponent,
      breakpoints: [0, 0.9, 1],
      initialBreakpoint: 0.9,
      cssClass: 'quick-log-sheet'
    });
    await modal.present();
  }
}
