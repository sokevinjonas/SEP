import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-breathing-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breathing-badge.component.html',
  styleUrls: ['./breathing-badge.component.scss']
})
export class BreathingBadgeComponent {
  @Input() label = 'Solde respirant';
  @Input() status: 'breathing' | 'safe' | 'warning' | 'danger' = 'breathing';
  @Input() pulse = true;
}
