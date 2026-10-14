import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  restaurantOutline,
  busOutline,
  bookOutline,
  timeOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  template: `
    <ion-content [fullscreen]="true" class="budget-content">
      <div class="page-container has-bottom-bars">
        <header class="page-header">
          <h2>Enveloppes &amp; Achats</h2>
          <p>Suivi des budgets et achats en réflexion</p>
        </header>

        <!-- Category Progress Section -->
        <section class="section-box">
          <h3 class="section-title">Enveloppes Budgétaires</h3>

          <div class="envelope-item">
            <div class="env-top">
              <div class="env-label">
                <ion-icon name="restaurant-outline"></ion-icon>
                <span>Nourriture &amp; Restauration</span>
              </div>
              <span class="env-ratio">78% (Avertissement)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill warn" style="width: 78%;"></div>
            </div>
          </div>

          <div class="envelope-item">
            <div class="env-top">
              <div class="env-label">
                <ion-icon name="bus-outline"></ion-icon>
                <span>Transport (Trotro)</span>
              </div>
              <span class="env-ratio">42% (Sain)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ok" style="width: 42%;"></div>
            </div>
          </div>

          <div class="envelope-item">
            <div class="env-top">
              <div class="env-label">
                <ion-icon name="book-outline"></ion-icon>
                <span>Polys &amp; Livres</span>
              </div>
              <span class="env-ratio">25% (Sain)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ok" style="width: 25%;"></div>
            </div>
          </div>
        </section>

        <!-- Considered Purchases Section -->
        <section class="section-box">
          <h3 class="section-title">Achats en réflexion (48h)</h3>

          <div class="purchase-card">
            <div class="pur-header">
              <h4 class="pur-name">Sneakers Nike Air</h4>
              <span class="pur-badge">
                <ion-icon name="time-outline"></ion-icon>
                18h restantes
              </span>
            </div>
            <div class="pur-meta">
              <span class="pur-cost">320.00 GHS</span>
              <span class="pur-days">Coût : 23 jours de repas</span>
            </div>
          </div>
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .budget-content {
      --background: var(--sep-base, #F7F3F6);
    }
    .page-container {
      padding: 24px 16px 140px;
      max-width: 500px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 20px;
      text-align: center;
    }
    .page-header h2 {
      font-size: 20px;
      font-weight: 900;
      color: var(--sep-primary, #714B67);
      margin: 0 0 4px;
    }
    .page-header p {
      font-size: 12px;
      font-weight: 600;
      color: var(--sep-mut, #6B5966);
      margin: 0;
    }
    .section-box {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--sep-mut, #6B5966);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 10px 2px;
    }
    .envelope-item {
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 8px;
    }
    .env-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .env-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
    }
    .env-label ion-icon {
      font-size: 16px;
      color: var(--sep-primary, #714B67);
    }
    .env-ratio {
      font-size: 11px;
      font-weight: 800;
      color: var(--sep-mut, #6B5966);
    }
    .progress-bar {
      height: 8px;
      background: var(--sep-base, #F7F3F6);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
    }
    .progress-fill.ok {
      background: var(--sep-action, #017e84);
    }
    .progress-fill.warn {
      background: var(--sep-warn, #ffac00);
    }
    .purchase-card {
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 14px;
      padding: 14px;
    }
    .pur-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .pur-name {
      font-size: 14px;
      font-weight: 800;
      color: var(--sep-ink, #2B1F28);
      margin: 0;
    }
    .pur-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #fff4e5;
      color: #b07000;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 9999px;
    }
    .pur-badge ion-icon {
      font-size: 12px;
    }
    .pur-meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .pur-cost {
      font-size: 16px;
      font-weight: 900;
      color: var(--sep-primary, #714B67);
    }
    .pur-days {
      font-size: 11px;
      font-weight: 700;
      color: var(--sep-mut, #6B5966);
    }
  `]
})
export class BudgetPage {
  constructor() {
    addIcons({
      walletOutline,
      restaurantOutline,
      busOutline,
      bookOutline,
      timeOutline,
      checkmarkCircleOutline
    });
  }
}
