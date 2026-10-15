import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface OtpRecord {
  email: string;
  code: string;
  expiresAt: number;
}

export interface UserBackup {
  userId: string;
  email: string;
  data: any;
  updatedAt: string;
}

interface DataStore {
  users: Record<string, User>; // key: email
  otps: Record<string, OtpRecord>; // key: email
  backups: Record<string, UserBackup>; // key: email
}

class DbService {
  private store: DataStore = {
    users: {},
    otps: {},
    backups: {}
  };

  private filePath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    this.filePath = path.join(dataDir, 'store.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.store = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[DbService] Could not load from disk, using memory store:', e);
    }
  }

  private saveToDisk(): void {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (e) {
      // In serverless / read-only filesystem environments, silence or log warning
    }
  }

  // --- OTP Operations ---
  saveOtp(email: string, code: string, expiresInMinutes = 10): void {
    const normEmail = email.toLowerCase().trim();
    this.store.otps[normEmail] = {
      email: normEmail,
      code,
      expiresAt: Date.now() + expiresInMinutes * 60 * 1000
    };
    this.saveToDisk();
  }

  verifyOtp(email: string, code: string): boolean {
    const normEmail = email.toLowerCase().trim();
    const record = this.store.otps[normEmail];
    if (!record) return false;

    if (Date.now() > record.expiresAt) {
      delete this.store.otps[normEmail];
      this.saveToDisk();
      return false;
    }

    if (record.code === code.trim()) {
      delete this.store.otps[normEmail];
      this.saveToDisk();
      return true;
    }

    return false;
  }

  // --- User Operations ---
  getOrCreateUser(email: string): User {
    const normEmail = email.toLowerCase().trim();
    const existing = this.store.users[normEmail];
    const now = new Date().toISOString();

    if (existing) {
      existing.lastLoginAt = now;
      this.saveToDisk();
      return existing;
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: normEmail,
      createdAt: now,
      lastLoginAt: now
    };

    this.store.users[normEmail] = newUser;
    this.saveToDisk();
    return newUser;
  }

  getUserByEmail(email: string): User | undefined {
    return this.store.users[email.toLowerCase().trim()];
  }

  // --- Backup Operations ---
  saveBackup(email: string, userId: string, data: any): UserBackup {
    const normEmail = email.toLowerCase().trim();
    const backup: UserBackup = {
      userId,
      email: normEmail,
      data,
      updatedAt: new Date().toISOString()
    };
    this.store.backups[normEmail] = backup;
    this.saveToDisk();
    return backup;
  }

  getBackup(email: string): UserBackup | undefined {
    const normEmail = email.toLowerCase().trim();
    return this.store.backups[normEmail];
  }
}

export const dbService = new DbService();
