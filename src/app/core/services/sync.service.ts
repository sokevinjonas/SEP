import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { IdbService } from '../db/idb.service';
import { SyncQueueRepository } from '../db/sync-queue.repository';
import { SyncItem } from '../models/financial.models';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly syncQueueRepo = inject(SyncQueueRepository);
  private readonly idbService = inject(IdbService);
  private isSyncing = false;
  private lastSyncedAt?: string;

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushPendingSync();
      });

      // Auto-flush pending mutations on app startup if already online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        setTimeout(() => {
          this.flushPendingSync();
        }, 1500);
      }
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const queue = await this.syncQueueRepo.getAll();
    const pendingItems = queue.filter((item: SyncItem) => item.status === 'pending');
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount: pendingItems.length,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt
    };
  }

  private readonly AUTH_TOKEN_KEY = 'sep_auth_token';
  private readonly USER_EMAIL_KEY = 'sep_user_email';

  getAuthToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.AUTH_TOKEN_KEY);
    }
    return null;
  }

  setAuthToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    }
  }

  getUserEmail(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.USER_EMAIL_KEY);
    }
    return null;
  }

  setUserEmail(email: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.USER_EMAIL_KEY, email);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  isLinked(): boolean {
    return this.isAuthenticated() && !!this.getUserEmail();
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.AUTH_TOKEN_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
    }
  }

  private getBaseUrl(): string {
    const env = environment as any;
    return env.apiUrl !== undefined ? env.apiUrl : (env.workerUrl || '');
  }

  private getAuthHeader(): string {
    const token = this.getAuthToken();
    if (token) {
      return `Bearer ${token}`;
    }
    return `Bearer ${environment.appSecretToken}`;
  }

  /**
   * Request a 6-digit OTP code sent by email.
   */
  async sendOtp(email: string): Promise<{ success: boolean; isNew?: boolean; message?: string; error?: string }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Connexion Internet requise pour envoyer le code.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.getBaseUrl()}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || `Erreur serveur (${response.status})` };
      }

      this.setUserEmail(email);
      return { success: true, isNew: data.isNew, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible de contacter le serveur.' };
    }
  }

  /**
   * Verify the 6-digit OTP code and retrieve user token + cloud backup if any.
   */
  async verifyOtp(email: string, code: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    hasBackup?: boolean;
    backupData?: any;
    isNew?: boolean;
    error?: string;
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Connexion Internet requise pour vérifier le code.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.getBaseUrl()}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Code incorrect ou expiré.' };
      }

      if (data.token) {
        this.setAuthToken(data.token);
        this.setUserEmail(email);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        hasBackup: data.hasBackup,
        backupData: data.backupData,
        isNew: data.isNew
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la vérification du code.' };
    }
  }

  /**
   * Flushes all pending mutations and captures in FIFO order.
   * Only active when the student has linked their account.
   */
  async flushPendingSync(): Promise<number> {
    if (!this.isAuthenticated() || this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return 0;
    }

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      const queue = await this.syncQueueRepo.getAll();
      const pendingItems = queue.filter((item: SyncItem) => item.status === 'pending');
      if (pendingItems.length === 0) {
        return 0;
      }

      // Group items for batch sync
      const payloadItems = pendingItems.map((item: SyncItem) => ({
        id: item.id,
        type: item.entity,
        action: item.action,
        payload: item.payload,
        timestamp: item.createdAt
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${this.getBaseUrl()}/api/sync`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: payloadItems }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        for (const item of pendingItems) {
          item.status = 'synced';
          await this.syncQueueRepo.update(item);
          syncedCount++;
        }
        this.lastSyncedAt = new Date().toISOString();
      } else {
        console.warn('[SyncService] Backend returned non-200. Queue preserved offline.');
      }
    } catch (error) {
      // Offline or network drop: items stay pending in IndexedDB safely
      console.warn('[SyncService] Sync attempt deferred (offline or server unreachable).');
    } finally {
      this.isSyncing = false;
    }

    return syncedCount;
  }

  /**
   * Pushes full IndexedDB state (profile, budget, categories, expenses, purchases) to Backend.
   */
  async backupToCloud(): Promise<{ success: boolean; stats?: any; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Compte non connecté. Connectez votre compte dans votre Profil pour activer la sauvegarde Cloud.' };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Connexion Internet requise pour la sauvegarde Cloud.' };
    }

    try {
      const fullData = await this.idbService.exportAllData();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${this.getBaseUrl()}/api/backup`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fullData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `Erreur serveur (${response.status}) pendant la sauvegarde.` };
      }

      const result = await response.json();
      this.lastSyncedAt = new Date().toISOString();
      return { success: true, stats: result.stats };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible de joindre le serveur de sauvegarde.' };
    }
  }

  /**
   * Fetches full state from Backend and restores IndexedDB.
   */
  async restoreFromCloud(): Promise<{ success: boolean; stats?: { expenses: number; purchases: number; categories: number }; error?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Compte non connecté. Connectez votre compte dans votre Profil pour restaurer depuis le Cloud.' };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Connexion Internet requise pour restaurer depuis le Cloud.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${this.getBaseUrl()}/api/restore`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader()
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `Erreur serveur (${response.status}) pendant la restauration.` };
      }

      const data = await response.json();
      const stats = await this.idbService.restoreAllData(data);
      this.lastSyncedAt = new Date().toISOString();

      return { success: true, stats };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible de joindre le serveur.' };
    }
  }
}

