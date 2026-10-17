import { Component, OnInit, OnDestroy } from '@angular/core';
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
    private toastCtrl: ToastController
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
    localStorage.setItem('sep_queued_captures', JSON.stringify(this.queuedCaptures));
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
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const capture: QueuedCapture = {
        id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        previewUrl: dataUrl,
        createdAt: new Date().toISOString(),
        status: 'queued'
      };

      this.queuedCaptures.unshift(capture);
      this.saveQueuedCaptures();

      // Launch automated OCR extraction
      await this.processCapture(capture);
    };

    reader.readAsDataURL(file);
    // Reset file input
    input.value = '';
  }


  // Story 3.3 & 3.4: Vision extraction & preview opening
  async processCapture(capture: QueuedCapture): Promise<void> {
    this.isScanning = true;
    capture.status = 'extracting';

    try {
      const extracted = await this.ocrService.extractFromImage(capture.fileName, capture.fileName);
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
      capture.status = 'failed';
      this.showToast('Échec de l\'extraction vision. Vous pouvez saisir les détails manuellement.', 'danger');
    } finally {
      this.isScanning = false;
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
    this.showToast('Capture removed from queue.', 'warning');
  }

  clearQueue(): void {
    this.queuedCaptures = [];
    this.saveQueuedCaptures();
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
