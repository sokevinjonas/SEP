import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, cloudUploadOutline, warningOutline } from 'ionicons/icons';

@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  template: `
    <ion-content [fullscreen]="true" class="capture-content">
      <div class="page-container has-bottom-bars">
        <header class="page-header">
          <h2>Capture Reçu &amp; MoMo</h2>
          <p>Scan OCR intelligent et stockage sécurisé R2</p>
        </header>

        <section class="upload-tile">
          <div class="upload-icon-circle">
            <ion-icon name="cloud-upload-outline"></ion-icon>
          </div>
          <h3>Importer un reçu ou screenshot MoMo</h3>
          <p>MTN Mobile Money, Vodafone Cash ou ticket papier</p>
        </section>

        <div class="info-note">
          <ion-icon name="camera-outline"></ion-icon>
          <span>Les captures prises hors-ligne sont mises en file d'attente automatique.</span>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .capture-content {
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
    .upload-tile {
      border: 2px dashed var(--sep-primary-light, #8d6482);
      background: #faf6f9;
      border-radius: 20px;
      padding: 36px 20px;
      text-align: center;
      margin-bottom: 16px;
      box-shadow: 0 2px 10px rgba(113, 75, 103, 0.04);
    }
    .upload-icon-circle {
      width: 54px;
      height: 54px;
      background: var(--sep-primary-soft, #f4ecf2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sep-primary, #714B67);
      margin: 0 auto 12px;
    }
    .upload-icon-circle ion-icon {
      font-size: 28px;
    }
    .upload-tile h3 {
      font-size: 15px;
      font-weight: 800;
      color: var(--sep-primary-dark, #58354f);
      margin: 0 0 4px;
    }
    .upload-tile p {
      font-size: 11px;
      font-weight: 600;
      color: var(--sep-mut, #6B5966);
      margin: 0;
    }
    .info-note {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--sep-card, #FFFFFF);
      border: 1px solid var(--sep-line, #EADFE7);
      border-radius: 14px;
      padding: 12px 14px;
      font-size: 12px;
      font-weight: 700;
      color: var(--sep-mut, #6B5966);
    }
    .info-note ion-icon {
      font-size: 20px;
      color: var(--sep-action, #017e84);
    }
  `]
})
export class CapturePage {
  constructor() {
    addIcons({ cameraOutline, cloudUploadOutline, warningOutline });
  }
}
