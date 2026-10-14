import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonAvatar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, cloudUploadOutline, warningOutline } from 'ionicons/icons';

@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonIcon,
    IonAvatar
  ],
  templateUrl: './capture.page.html',
  styleUrls: ['./capture.page.scss']
})
export class CapturePage {
  constructor() {
    addIcons({ cameraOutline, cloudUploadOutline, warningOutline });
  }
}
