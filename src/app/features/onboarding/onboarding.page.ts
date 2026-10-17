import { Component, signal } from '@angular/core';
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
  arrowBackOutline,
  timeOutline,
  walletOutline,
  trophyOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  checkmarkOutline
} from 'ionicons/icons';

export interface OnboardingSlide {
  badge: string;
  badgeIcon: string;
  tag: string;
  title: string;
  titleHighlight: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

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
  readonly currentStep = signal<number>(0);

  readonly slides: OnboardingSlide[] = [
    {
      badge: 'STEP 1 OF 3',
      badgeIcon: 'time-outline',
      tag: '48h Anti-Impulse Rule',
      title: 'Pause Before You',
      titleHighlight: 'Spend Campus Money',
      description: 'Tempted by spontaneous cravings or sales? Put impulse wants on a 48-hour hesitation timer. Most unneeded expenses vanish when you sleep on them.',
      imageSrc: 'assets/images/onboarding_step1.jpg',
      imageAlt: 'African student thoughtfully pausing impulse buy with 48h timer'
    },
    {
      badge: 'STEP 2 OF 3',
      badgeIcon: 'wallet-outline',
      tag: 'Smart Envelopes',
      title: 'Track Campus Envelopes,',
      titleHighlight: 'Never Run Out Mid-Month',
      description: 'Divide your allowance into clear daily envelopes: Meals, Bus transit, Books, and Mobile Data. See your real daily spending limit at a single glance.',
      imageSrc: 'assets/images/onboarding_step2.jpg',
      imageAlt: 'African student organizing budget envelopes'
    },
    {
      badge: 'STEP 3 OF 3',
      badgeIcon: 'trophy-outline',
      tag: 'Safe Campus Vault',
      title: 'Grow Your Savings Vault,',
      titleHighlight: 'Guarded by M. Pognon',
      description: 'Every avoided craving turns into safe savings in your vault. M. Pognon keeps watch over your campus finances with zero judgment and strict discipline.',
      imageSrc: 'assets/images/onboarding_step3.jpg',
      imageAlt: 'African student saving in vault guarded by M. Pognon'
    }
  ];

  private touchStartX = 0;
  private touchEndX = 0;

  constructor(private router: Router) {
    addIcons({
      arrowForwardOutline,
      arrowBackOutline,
      timeOutline,
      walletOutline,
      trophyOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      checkmarkOutline
    });
  }

  nextStep(): void {
    if (this.currentStep() < this.slides.length - 1) {
      this.currentStep.update((s: number) => s + 1);
    } else {
      this.startRegistration();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((s: number) => s - 1);
    }
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentStep.set(index);
    }
  }

  skip(): void {
    this.startRegistration();
  }

  startRegistration(): void {
    this.router.navigate(['/register']);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;
    if (diff > swipeThreshold) {
      this.nextStep();
    } else if (diff < -swipeThreshold) {
      this.prevStep();
    }
  }
}
