import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonAvatar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  sparklesOutline,
  shieldCheckmarkOutline,
  globeOutline,
  flashOutline,
  cashOutline,
  timeOutline,
  helpCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonAvatar
  ],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss']
})
export class OnboardingPage {
  constructor(private router: Router) {
    addIcons({
      arrowForwardOutline,
      sparklesOutline,
      shieldCheckmarkOutline,
      globeOutline,
      flashOutline,
      cashOutline,
      timeOutline,
      helpCircleOutline
    });
  }

  startRegistration(): void {
    this.router.navigate(['/register']);
  }
}
