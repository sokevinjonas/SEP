import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ExtractedFieldConfidence {
  field: string;
  isConfident: boolean;
  reason?: string;
}

export interface ExtractedReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  categoryId: string;
  categoryName: string;
  selected?: boolean;
}

export interface ExtractedTransaction {
  id?: string;
  amount: number;
  currency: 'GHS' | 'XOF';
  categoryId: string;
  categoryName: string;
  merchant: string;
  date: string;
  transactionReference: string;
  source: 'ocr_momo' | 'ocr_receipt';
  confidence: {
    amount: boolean;
    merchant: boolean;
    category: boolean;
    reference: boolean;
  };
  uncertainNote?: string;
  imageDataUrl?: string;
  fileName?: string;
  amountPaid?: number;
  change?: number;
  itemQty?: number;
  items?: ExtractedReceiptItem[];
}

export interface QueuedCapture {
  id: string;
  fileName: string;
  fileSizeKb: number;
  previewUrl: string;
  createdAt: string;
  status: 'queued' | 'extracting' | 'ready' | 'synced' | 'failed';
  extractedData?: ExtractedTransaction;
}

@Injectable({
  providedIn: 'root'
})
export class OcrService {

  /**
   * Processes an image file or DataURL through intelligent OCR extraction.
   * Calls the backend AI vision pipeline when online,
   * with graceful local fallback if offline.
   */
  async extractFromImage(file: File | string, fileName?: string): Promise<ExtractedTransaction> {
    const name = typeof file === 'string' ? (fileName || 'capture.jpg') : file.name;

    // 1. Attempt online backend Vision extraction if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const formData = new FormData();
        if (file instanceof File) {
          formData.append('file', file);
        } else if (typeof file === 'string' && file.startsWith('data:')) {
          // Convert Data URL to Blob
          const res = await fetch(file);
          const blob = await res.blob();
          formData.append('file', blob, name);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch(`${environment.workerUrl}/api/captures`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${environment.appSecretToken}`
          },
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const result: any = await response.json();
          if (result && result.extracted) {
            return {
              amount: result.extracted.amount || 0,
              currency: result.extracted.currency || 'GHS',
              categoryId: result.extracted.categoryId || 'cat-food',
              categoryName: result.extracted.categoryName || 'Food & Chop',
              merchant: result.extracted.merchant || 'Commerce',
              date: result.extracted.date || new Date().toISOString(),
              transactionReference: result.extracted.transactionReference || '',
              source: result.extracted.transactionReference?.includes('MTN') ? 'ocr_momo' : 'ocr_receipt',
              confidence: result.extracted.confidence || { amount: true, merchant: true, category: true, reference: true },
              uncertainNote: result.extracted.uncertainNote,
              fileName: name,
              amountPaid: result.extracted.amountPaid,
              change: result.extracted.change,
              itemQty: result.extracted.itemQty,
              items: result.extracted.items || []
            };
          }
        }

        const errData: any = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error during GPT-4o analysis (HTTP ${response.status})`);
      } catch (err: any) {
        console.error('[OcrService] GPT-4o vision extraction failed:', err);
        throw err;
      }
    } else {
      throw new Error('You are currently offline. An internet connection is required to analyze receipts with GPT-4o.');
    }
  }
}

