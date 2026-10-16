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
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
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
      return res.status(500).json({ success: false, error: 'Failed to send verification email.' });
    }

    return res.json({
      success: true,
      isNew,
      message: isNew
        ? 'Welcome! An email with your 6-digit activation code has been sent.'
        : 'Verification code sent to your email address.',
      email: normEmail
    });
  } catch (err: any) {
    console.error('[send-otp Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
  }
});

// 2. POST /api/auth/verify-otp
authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const normEmail = (email as string).toLowerCase().trim();
    const isValid = dbService.verifyOtp(normEmail, (code as string).trim());

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
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
    return res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
  }
});

