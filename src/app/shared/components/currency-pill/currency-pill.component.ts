import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { swapHorizontalOutline } from 'ionicons/icons';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-currency-pill',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './currency-pill.component.html',
  styleUrls: ['./currency-pill.component.scss']
})
export class CurrencyPillComponent {
  constructor(public currencyService: CurrencyService) {
    addIcons({ swapHorizontalOutline });
  }

  toggle() {
    this.currencyService.toggleCurrency();
  }
}
