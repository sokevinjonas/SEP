"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRouter = exports.authMiddleware = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_service_js_1 = require("../services/db.service.js");
const config_js_1 = require("../config.js");
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing access token.' });
    }
    const token = authHeader.split(' ')[1];
    // 1. Check if it's the shared secret token
    if (token === config_js_1.config.appSecretToken) {
        req.userEmail = (req.body?.profile?.email || req.query.email || 'current_user@studentsavings.app');
        req.userId = 'current_user';
        return next();
    }
    // 2. Otherwise verify JWT
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_js_1.config.jwtSecret);
        req.userEmail = decoded.email;
        req.userId = decoded.id;
        return next();
    }
    catch (err) {
        return res.status(401).json({ success: false, error: 'Session expired or invalid token.' });
    }
};
exports.authMiddleware = authMiddleware;
exports.syncRouter = (0, express_1.Router)();
// POST /api/backup
exports.syncRouter.post('/backup', exports.authMiddleware, async (req, res) => {
    try {
        const body = req.body;
        const email = req.userEmail || body.profile?.email || 'student@campus.app';
        const userId = req.userId || 'usr_default';
        const saved = db_service_js_1.dbService.saveBackup(email, userId, body);
        const stats = {
            expenses: Array.isArray(body.expenses) ? body.expenses.length : 0,
            purchases: Array.isArray(body.purchases) ? body.purchases.length : 0,
            categories: Array.isArray(body.categories) ? body.categories.length : 0
        };
        return res.json({
            success: true,
            updatedAt: saved.updatedAt,
            stats
        });
    }
    catch (err) {
        console.error('[backup Error]', err);
        return res.status(500).json({ success: false, error: err.message || 'Error during cloud backup.' });
    }
});
// GET /api/restore
exports.syncRouter.get('/restore', exports.authMiddleware, async (req, res) => {
    try {
        const email = req.userEmail || req.query.email;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required to restore cloud backup.' });
        }
        const backup = db_service_js_1.dbService.getBackup(email);
        if (!backup || !backup.data) {
            return res.json({
                success: true,
                restoredAt: new Date().toISOString(),
                profile: null,
                monthlyBudget: null,
                categories: [],
                expenses: [],
                purchases: []
            });
        }
        const d = backup.data;
        const stats = {
            expenses: Array.isArray(d.expenses) ? d.expenses.length : 0,
            purchases: Array.isArray(d.purchases) ? d.purchases.length : 0,
            categories: Array.isArray(d.categories) ? d.categories.length : 0
        };
        return res.json({
            success: true,
            restoredAt: backup.updatedAt,
            stats,
            profile: d.profile || null,
            monthlyBudget: d.monthlyBudget || null,
            categories: d.categories || [],
            expenses: d.expenses || [],
            purchases: d.purchases || []
        });
    }
    catch (err) {
        console.error('[restore Error]', err);
        return res.status(500).json({ success: false, error: err.message || 'Error during cloud restore.' });
    }
});
// POST /api/sync (Incremental queue sync)
exports.syncRouter.post('/sync', exports.authMiddleware, async (req, res) => {
    try {
        const { items } = req.body;
        return res.json({
            success: true,
            synced: Array.isArray(items) ? items.length : 0
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
