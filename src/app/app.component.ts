import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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
export class AppComponent implements OnInit {
  readonly showNavigation = signal<boolean>(false);

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    addIcons({ homeOutline, cameraOutline, walletOutline });
  }

  ngOnInit(): void {
    // Check initial route
    this.updateNavigationVisibility(this.router.url);

    // Track navigation events
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateNavigationVisibility(event.urlAfterRedirects || event.url);
    });
  }

  private updateNavigationVisibility(url: string): void {
    const isExcluded = !url || url.includes('/onboarding');
    this.showNavigation.set(!isExcluded);
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
