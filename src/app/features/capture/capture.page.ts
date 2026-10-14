import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, cloudUploadOutline, warningOutline } from 'ionicons/icons';

@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './capture.page.html',
  styleUrls: ['./capture.page.scss']
})
export class CapturePage {
  constructor() {
    addIcons({ cameraOutline, cloudUploadOutline, warningOutline });
  }
}
