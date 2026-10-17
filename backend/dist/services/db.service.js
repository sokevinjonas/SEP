"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_js_1 = require("../utils/uuid.js");
class DbService {
    store = {
        users: {},
        otps: {},
        backups: {}
    };
    filePath;
    constructor() {
        const dataDir = path_1.default.resolve(process.cwd(), 'data');
        this.filePath = path_1.default.join(dataDir, 'store.json');
        this.loadFromDisk();
    }
    loadFromDisk() {
        try {
            if (fs_1.default.existsSync(this.filePath)) {
                const raw = fs_1.default.readFileSync(this.filePath, 'utf-8');
                this.store = JSON.parse(raw);
            }
        }
        catch (e) {
            console.warn('[DbService] Could not load from disk, using memory store:', e);
        }
    }
    saveToDisk() {
        try {
            const dataDir = path_1.default.dirname(this.filePath);
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            fs_1.default.writeFileSync(this.filePath, JSON.stringify(this.store, null, 2), 'utf-8');
        }
        catch (e) {
            // In serverless / read-only filesystem environments, silence or log warning
        }
    }
    // --- OTP Operations ---
    saveOtp(email, code, expiresInMinutes = 10) {
        const normEmail = email.toLowerCase().trim();
        this.store.otps[normEmail] = {
            email: normEmail,
            code,
            expiresAt: Date.now() + expiresInMinutes * 60 * 1000
        };
        this.saveToDisk();
    }
    verifyOtp(email, code) {
        const normEmail = email.toLowerCase().trim();
        const record = this.store.otps[normEmail];
        if (!record)
            return false;
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
    getOrCreateUser(email) {
        const normEmail = email.toLowerCase().trim();
        const existing = this.store.users[normEmail];
        const now = new Date().toISOString();
        if (existing) {
            existing.lastLoginAt = now;
            this.saveToDisk();
            return existing;
        }
        const newUser = {
            id: (0, uuid_js_1.generateUuidV7)(),
            email: normEmail,
            createdAt: now,
            lastLoginAt: now
        };
        this.store.users[normEmail] = newUser;
        this.saveToDisk();
        return newUser;
    }
    getUserByEmail(email) {
        return this.store.users[email.toLowerCase().trim()];
    }
    // --- Backup Operations ---
    saveBackup(email, userId, data) {
        const normEmail = email.toLowerCase().trim();
        const backup = {
            userId,
            email: normEmail,
            data,
            updatedAt: new Date().toISOString()
        };
        this.store.backups[normEmail] = backup;
        this.saveToDisk();
        return backup;
    }
    getBackup(email) {
        const normEmail = email.toLowerCase().trim();
        return this.store.backups[normEmail];
    }
    getAllBackups() {
        return Object.values(this.store.backups);
    }
}
exports.dbService = new DbService();
