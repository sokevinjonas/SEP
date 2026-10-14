import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonApp,
  IonRouterOutlet,
  ModalController,
  ToastController
} from '@ionic/angular';
import { ActionBarComponent } from './shared/components/action-bar/action-bar.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { QuickLogModalComponent } from './shared/components/quick-log-modal/quick-log-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet,
    ActionBarComponent,
    BottomNavComponent
  ],
})
export class AppComponent {
  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

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
