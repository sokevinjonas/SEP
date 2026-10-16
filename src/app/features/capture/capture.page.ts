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
  cameraOutline,
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
  flashOutline,
  clipboardOutline
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
    IonChip,
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

  samplePresets: ReturnType<OcrService['getSamplePresets']> = [];

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
      cameraOutline,
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
      flashOutline,
      clipboardOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.budgetFacade.load();
    this.categories = this.budgetFacade.categories();
    this.samplePresets = this.ocrService.getSamplePresets();
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

  // Test with preset sample
  async loadPreset(preset: typeof this.samplePresets[0]): Promise<void> {
    const capture: QueuedCapture = {
      id: `cap-preset-${Date.now()}`,
      fileName: preset.filename,
      fileSizeKb: 142,
      previewUrl: 'assets/images/m_pognon_coin_logo.jpg',
      createdAt: new Date().toISOString(),
      status: 'queued'
    };

    this.queuedCaptures.unshift(capture);
    this.saveQueuedCaptures();

    await this.processCapture(capture);
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

  /**
   * Quick MoMo / Telecel SMS parse:
   * Direct text paste from Ghana mobile money SMS confirmation without image file upload
   */
  async openPasteSmsModal(): Promise<void> {
    let clipboardText = '';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch {
      // Permission not granted or browser sandbox
    }

    const alert = await this.alertCtrl.create({
      header: 'Paste MoMo / Telecel SMS',
      subHeader: 'Instant extraction without screenshot',
      message: 'Paste your payment confirmation message from MTN Mobile Money or Telecel Cash:',
      inputs: [
        {
          name: 'smsText',
          type: 'textarea',
          value: (clipboardText && (clipboardText.includes('GHS') || clipboardText.includes('Payment') || clipboardText.includes('sent'))) ? clipboardText : '',
          placeholder: 'e.g. Payment made for GHS 25.00 to Mama Kiki Eatery. Transaction ID: 19827391. Current Balance: GHS 140.'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Extract & Review',
          handler: (data) => {
            const text = (data.smsText || '').trim();
            if (!text) {
              return false;
            }
            this.parseAndOpenSmsExtraction(text);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private parseAndOpenSmsExtraction(sms: string): void {
    // 1. Amount: look for GHS 25.00, GH¢ 25, 25.00 GHS
    let amount = 15;
    const amountMatch = sms.match(/(?:GHS|GH¢|GHC)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                        sms.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:GHS|GH¢|GHC)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // 2. Merchant: look for "to [Merchant]" or "at [Merchant]"
    let merchant = 'Mobile Money Merchant';
    const merchantMatch = sms.match(/(?:to|at|paid to)\s+([A-Za-z0-9\s&'-]+?)(?:\.|\s+on|\s+ref|\s+trans|\s+current|$)/i);
    if (merchantMatch && merchantMatch[1]) {
      merchant = merchantMatch[1].trim();
    }

    // 3. Transaction Reference: ID: 12345 or Ref: 12345
    let ref = `MOMO-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const refMatch = sms.match(/(?:Transaction ID|Trans ID|Reference|Ref\.?)\s*[:\s]?\s*([A-Za-z0-9]+)/i);
    if (refMatch && refMatch[1]) {
      ref = refMatch[1].trim();
    }

    // 4. Auto Category heuristic
    let categoryId = 'cat-food';
    let categoryName = 'Food & Chop';
    const lowerSms = sms.toLowerCase();
    if (lowerSms.includes('trotro') || lowerSms.includes('uber') || lowerSms.includes('bolt') || lowerSms.includes('ride')) {
      categoryId = 'cat-transport';
      categoryName = 'Transport & Trotro';
    } else if (lowerSms.includes('book') || lowerSms.includes('copy') || lowerSms.includes('print')) {
      categoryId = 'cat-books';
      categoryName = 'Books & Copies';
    }

    const extracted: ExtractedTransaction = {
      amount,
      currency: 'GHS',
      categoryId,
      categoryName,
      merchant,
      date: new Date().toISOString(),
      transactionReference: ref,
      source: 'ocr_momo',
      confidence: {
        amount: true,
        merchant: true,
        category: true,
        reference: true
      },
      fileName: 'Pasted MoMo SMS'
    };

    const capture: QueuedCapture = {
      id: `cap-sms-${Date.now()}`,
      fileName: 'MoMo SMS',
      fileSizeKb: 1,
      previewUrl: 'assets/images/m_pognon_coin_logo.jpg',
      createdAt: new Date().toISOString(),
      status: 'ready',
      extractedData: extracted
    };

    this.queuedCaptures.unshift(capture);
    this.saveQueuedCaptures();
    this.openExistingPreview(capture);
  }
}
