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
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss']
})
export class BottomNavComponent {
  constructor(private router: Router) {
    addIcons({ homeOutline, cameraOutline, walletOutline });
  }

  isActive(route: string): boolean {
    return this.router.url === route || (route === '/home' && this.router.url === '/');
  }
}
