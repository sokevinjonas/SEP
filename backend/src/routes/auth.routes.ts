import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/db.service.js';
import { emailService } from '../services/email.service.js';
import { config } from '../config.js';

export const authRouter = Router();

// 1. POST /api/auth/send-otp
authRouter.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Adresse email valide requise.' });
    }

    const normEmail = email.toLowerCase().trim();
    // Check if new or existing user
    const existingUser = dbService.getUserByEmail(normEmail);
    const isNew = !existingUser;

    // Generate secure 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    dbService.saveOtp(normEmail, code, 10);
    const sent = await emailService.sendOtpEmail(normEmail, code, isNew);

    if (!sent) {
      return res.status(500).json({ success: false, error: "Erreur lors de l'envoi du mail de vérification." });
    }

    return res.json({
      success: true,
      isNew,
      message: isNew
        ? 'Bienvenue ! Un email avec votre code d\'activation à 6 chiffres vous a été envoyé.'
        : 'Code de vérification envoyé à votre adresse email.',
      email: normEmail
    });
  } catch (err: any) {
    console.error('[send-otp Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur serveur.' });
  }
});

// 2. POST /api/auth/verify-otp
authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email et code OTP requis.' });
    }

    const normEmail = (email as string).toLowerCase().trim();
    const isValid = dbService.verifyOtp(normEmail, (code as string).trim());

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Code de vérification incorrect ou expiré.' });
    }

    const user = dbService.getOrCreateUser(normEmail);
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '90d' }
    );

    const existingBackup = dbService.getBackup(normEmail);

    return res.json({
      success: true,
      token,
      user,
      hasBackup: !!existingBackup,
      backupData: existingBackup ? existingBackup.data : null
    });
  } catch (err: any) {
    console.error('[verify-otp Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur serveur.' });
  }
});
