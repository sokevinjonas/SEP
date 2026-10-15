"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_service_js_1 = require("../services/db.service.js");
const email_service_js_1 = require("../services/email.service.js");
const config_js_1 = require("../config.js");
exports.authRouter = (0, express_1.Router)();
// 1. POST /api/auth/send-otp
exports.authRouter.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ success: false, error: 'Adresse email valide requise.' });
        }
        const normEmail = email.toLowerCase().trim();
        // Generate secure 6-digit numeric code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        db_service_js_1.dbService.saveOtp(normEmail, code, 10);
        const sent = await email_service_js_1.emailService.sendOtpEmail(normEmail, code);
        if (!sent) {
            return res.status(500).json({ success: false, error: "Erreur lors de l'envoi du mail de vérification." });
        }
        return res.json({
            success: true,
            message: 'Code OTP envoyé par email avec succès.',
            email: normEmail
        });
    }
    catch (err) {
        console.error('[send-otp Error]', err);
        return res.status(500).json({ success: false, error: err.message || 'Erreur serveur.' });
    }
});
// 2. POST /api/auth/verify-otp
exports.authRouter.post('/verify-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'Email et code OTP requis.' });
        }
        const normEmail = email.toLowerCase().trim();
        const isValid = db_service_js_1.dbService.verifyOtp(normEmail, code.trim());
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Code de vérification incorrect ou expiré.' });
        }
        const user = db_service_js_1.dbService.getOrCreateUser(normEmail);
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, config_js_1.config.jwtSecret, { expiresIn: '90d' });
        const existingBackup = db_service_js_1.dbService.getBackup(normEmail);
        return res.json({
            success: true,
            token,
            user,
            hasBackup: !!existingBackup,
            backupData: existingBackup ? existingBackup.data : null
        });
    }
    catch (err) {
        console.error('[verify-otp Error]', err);
        return res.status(500).json({ success: false, error: err.message || 'Erreur serveur.' });
    }
});
