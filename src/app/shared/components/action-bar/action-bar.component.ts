import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, flameOutline, flashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <div class="thumb-action-container">
      <ion-button
        class="action-btn buy-btn"
        (click)="onWantToBuy()"
        id="btn-want-to-buy">
        <ion-icon slot="start" name="flash-outline"></ion-icon>
        I want to buy
      </ion-button>

      <ion-button
        class="action-btn add-btn"
        (click)="onQuickLog()"
        id="btn-quick-log">
        <ion-icon slot="start" name="add-outline"></ion-icon>
        + Add
      </ion-button>
    </div>
  `,
  styles: [`
    .thumb-action-container {
      display: flex;
      gap: 10px;
      width: 100%;
      margin-bottom: 8px;
    }

    .action-btn {
      --border-radius: 16px;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: -0.01em;
      margin: 0;
      min-height: 52px;
      height: 52px;
      transition: transform 0.1s ease;
    }

    .action-btn:active {
      transform: scale(0.98);
    }

    .buy-btn {
      flex: 1.25;
      --background: var(--sep-primary, #714B67);
      --color: #ffffff;
      --box-shadow: 0 4px 14px rgba(113, 75, 103, 0.35);
    }

    .add-btn {
      flex: 0.75;
      --background: var(--sep-action, #017e84);
      --color: #ffffff;
      --box-shadow: 0 4px 14px rgba(1, 126, 132, 0.35);
    }

    ion-icon {
      font-size: 18px;
    }
  `]
})
export class ActionBarComponent {
  @Output() wantToBuy = new EventEmitter<void>();
  @Output() quickLog = new EventEmitter<void>();

  constructor() {
    addIcons({ addOutline, flameOutline, flashOutline });
  }

  onWantToBuy() {
    this.wantToBuy.emit();
  }

  onQuickLog() {
    this.quickLog.emit();
  }
}
