import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, cameraOutline, walletOutline } from 'ionicons/icons';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, IonIcon],
  template: `
    <nav class="bottom-nav-bar">
      <div
        class="nav-tab"
        [class.active]="isActive('/home')"
        routerLink="/home"
        id="tab-btn-home">
        <ion-icon name="home-outline"></ion-icon>
        <span>Home</span>
      </div>

      <div
        class="nav-tab"
        [class.active]="isActive('/capture')"
        routerLink="/capture"
        id="tab-btn-capture">
        <ion-icon name="camera-outline"></ion-icon>
        <span>Capture</span>
      </div>

      <div
        class="nav-tab"
        [class.active]="isActive('/budget')"
        routerLink="/budget"
        id="tab-btn-budget">
        <ion-icon name="wallet-outline"></ion-icon>
        <span>Budget</span>
      </div>
    </nav>
  `,
  styles: [`
    .bottom-nav-bar {
      height: 58px;
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 9999px;
      box-shadow: 0 6px 20px rgba(113, 75, 103, 0.10);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 10px;
      width: 100%;
    }

    .nav-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 30%;
      height: 100%;
      color: var(--sep-mut, #6B5966);
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      user-select: none;
      transition: color 0.15s ease;
    }

    .nav-tab ion-icon {
      font-size: 22px;
      transition: transform 0.15s ease;
    }

    .nav-tab.active {
      color: var(--sep-primary, #714B67);
    }

    .nav-tab.active ion-icon {
      transform: scale(1.1);
    }
  `]
})
export class BottomNavComponent {
  constructor(private router: Router) {
    addIcons({ homeOutline, cameraOutline, walletOutline });
  }

  isActive(route: string): boolean {
    return this.router.url === route || (route === '/home' && this.router.url === '/');
  }
}
