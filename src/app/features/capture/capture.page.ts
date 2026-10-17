import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonChip,
  IonBadge,
  IonAvatar,
  IonSpinner,
  IonModal,
  AlertController,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  cloudDoneOutline,
  warningOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  imageOutline,
  trashOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  timeOutline,
  documentTextOutline,
  sparklesOutline,
  saveOutline,
  helpCircleOutline,
  flashOutline
} from 'ionicons/icons';
import { ExpensesFacade } from '../expenses/facade/expenses.facade';
import { BudgetFacade } from '../budget/facade/budget.facade';
import { CurrencyService } from '../../core/services/currency.service';
import { OcrService, ExtractedTransaction, QueuedCapture } from '../../core/services/ocr.service';
import { Category, Expense } from '../../core/models/financial.models';

@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonBadge,
    IonAvatar,
    IonSpinner,
    IonModal
  ],
  templateUrl: './capture.page.html',
  styleUrls: ['./capture.page.scss']
})
export class CapturePage implements OnInit, OnDestroy {
  isScanning = false;
  isOnline = navigator.onLine;

  categories: Category[] = [];
  queuedCaptures: QueuedCapture[] = [];

  // Preview & Validation Sheet State (Story 3.4 & Story 3.5)
  isPreviewOpen = false;
  activeExtraction: ExtractedTransaction | null = null;
  activeCapture: QueuedCapture | null = null;

  isDuplicateDetected = false;
  existingDuplicateExpense: Expense | null = null;

  private onlineListener = () => { this.isOnline = true; };
  private offlineListener = () => { this.isOnline = false; };

  constructor(
    private expensesFacade: ExpensesFacade,
    private budgetFacade: BudgetFacade,
    public currencyService: CurrencyService,
    private ocrService: OcrService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      cloudUploadOutline,
      cloudDoneOutline,
      warningOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      closeOutline,
      imageOutline,
      trashOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      timeOutline,
      documentTextOutline,
      sparklesOutline,
      saveOutline,
      helpCircleOutline,
      flashOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.budgetFacade.load();
    this.categories = this.budgetFacade.categories();
    this.loadQueuedCaptures();

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineListener);
    window.removeEventListener('offline', this.offlineListener);
  }

  private loadQueuedCaptures(): void {
    const raw = localStorage.getItem('sep_queued_captures');
    if (raw) {
      try {
        this.queuedCaptures = JSON.parse(raw);
      } catch {
        this.queuedCaptures = [];
      }
    }
  }

  private saveQueuedCaptures(): void {
    try {
      localStorage.setItem('sep_queued_captures', JSON.stringify(this.queuedCaptures));
    } catch (e) {
      console.warn('[CapturePage] LocalStorage quota exceeded, storing lean metadata', e);
      try {
        const lean = this.queuedCaptures.map(c => ({
          ...c,
          // Strip oversized data urls from localStorage to prevent QuotaExceededError
          previewUrl: c.previewUrl && c.previewUrl.length > 50000 ? '' : c.previewUrl
        }));
        localStorage.setItem('sep_queued_captures', JSON.stringify(lean));
      } catch (inner) {
        console.error('[CapturePage] Failed to persist queue to localStorage', inner);
      }
    }
  }

  // Generates a lightweight, sharp thumbnail (~15KB) for responsive UI and safe offline storage
  private createThumbnail(file: File, maxDim: number = 320): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          } else {
            resolve((e.target?.result as string) || '');
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  // File Picker Trigger
  triggerFileInput(inputElement: HTMLInputElement): void {
    inputElement.click();
  }

  // Handle uploaded or photographed file (Story 3.1)
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    // Reset file input so re-selecting the same file also triggers
    input.value = '';

    // Generate lightweight thumbnail for instant display in queue
    const thumbnailDataUrl = await this.createThumbnail(file);

    const capture: QueuedCapture = {
      id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      previewUrl: thumbnailDataUrl,
      createdAt: new Date().toISOString(),
      status: 'queued'
    };

    // 1. Immediately insert into queue and force Angular re-render
    this.queuedCaptures.unshift(capture);
    this.saveQueuedCaptures();
    this.cdr.detectChanges();

    // 2. Launch OCR extraction with original File object
    await this.processCapture(capture, file);
  }

  // Story 3.3 & 3.4: Vision extraction & preview opening
  async processCapture(capture: QueuedCapture, fileObj?: File): Promise<void> {
    this.isScanning = true;
    capture.status = 'extracting';
    this.cdr.detectChanges();

    try {
      // Pass the original File object if available, otherwise dataUrl or filename
      const targetPayload = fileObj || capture.previewUrl || capture.fileName;
      const extracted = await this.ocrService.extractFromImage(targetPayload, capture.fileName);
      extracted.imageDataUrl = capture.previewUrl;
      capture.extractedData = extracted;
      capture.status = 'ready';
      this.saveQueuedCaptures();

      // Story 3.5: Check for duplicate transaction reference
      await this.checkDuplicate(extracted.transactionReference);

      this.activeCapture = capture;
      this.activeExtraction = extracted;
      this.isPreviewOpen = true;
    } catch (err) {
      console.error('[CapturePage processCapture Error]', err);
      capture.status = 'failed';
      await this.showToast('Échec de l\'extraction vision. Vous pouvez saisir les détails manuellement.', 'danger');
    } finally {
      this.isScanning = false;
      this.cdr.detectChanges();
    }
  }

  // Story 3.5: Duplicate Transaction Detection
  async checkDuplicate(ref: string): Promise<void> {
    this.isDuplicateDetected = false;
    this.existingDuplicateExpense = null;

    if (!ref || !ref.trim()) return;

    const existing = await this.expensesFacade.checkDuplicateReference(ref);
    if (existing) {
      this.isDuplicateDetected = true;
      this.existingDuplicateExpense = existing;
    }
  }

  openExistingPreview(capture: QueuedCapture): void {
    if (capture.extractedData) {
      this.activeCapture = capture;
      this.activeExtraction = { ...capture.extractedData };
      this.checkDuplicate(this.activeExtraction.transactionReference);
      this.isPreviewOpen = true;
    } else {
      this.processCapture(capture);
    }
  }

  closePreview(): void {
    this.isPreviewOpen = false;
    this.activeCapture = null;
    this.activeExtraction = null;
    this.cdr.detectChanges();
  }

  // Story 3.4: Validate & Commit Expense to Local Database
  async validateAndSaveExpense(): Promise<void> {
    if (!this.activeExtraction) return;

    if (this.activeExtraction.amount <= 0) {
      this.showToast('Le montant extrait doit être supérieur à zéro.', 'warning');
      return;
    }

    const expense: Expense = {
      id: `exp-ocr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: this.activeExtraction.amount,
      currency: this.activeExtraction.currency,
      categoryId: this.activeExtraction.categoryId,
      categoryName: this.getCategoryName(this.activeExtraction.categoryId),
      merchant: this.activeExtraction.merchant.trim(),
      note: `OCR Capture (${this.activeExtraction.source === 'ocr_momo' ? 'Mobile Money' : 'Paper Receipt'})`,
      date: this.activeExtraction.date || new Date().toISOString(),
      source: this.activeExtraction.source,
      transactionRef: this.activeExtraction.transactionReference || undefined,
      createdAt: new Date().toISOString()
    };

    await this.expensesFacade.addExpense(expense);

    if (this.activeCapture) {
      this.activeCapture.status = 'synced';
      this.saveQueuedCaptures();
    }

    this.closePreview();
    await this.showToast(`Expense of ${expense.amount} ${expense.currency} recorded successfully!`, 'success');
  }

  getCategoryName(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.name : 'Other';
  }

  deleteQueuedCapture(id: string, event: Event): void {
    event.stopPropagation();
    this.queuedCaptures = this.queuedCaptures.filter(c => c.id !== id);
    this.saveQueuedCaptures();
    this.cdr.detectChanges();
    this.showToast('Capture removed from queue.', 'warning');
  }

  clearQueue(): void {
    this.queuedCaptures = [];
    this.saveQueuedCaptures();
    this.cdr.detectChanges();
    this.showToast('Capture queue cleared successfully.', 'success');
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }


}
