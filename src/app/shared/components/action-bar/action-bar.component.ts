import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, flameOutline, flashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss']
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
