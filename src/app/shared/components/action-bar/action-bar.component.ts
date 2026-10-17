import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [CommonModule, IonButton],
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss']
})
export class ActionBarComponent {
  @Output() wantToBuy = new EventEmitter<void>();
  @Output() quickLog = new EventEmitter<void>();

  constructor() {
  }

  onWantToBuy() {
    this.wantToBuy.emit();
  }

  onQuickLog() {
    this.quickLog.emit();
  }
}
