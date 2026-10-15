import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/db.service.js';
import { config } from '../config.js';

export interface AuthenticatedRequest extends Request {
  userEmail?: string;
  userId?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Accès non autorisé : Token manquant.' });
  }

  const token = authHeader.split(' ')[1];

  // 1. Check if it's the shared secret token
  if (token === config.appSecretToken) {
    req.userEmail = (req.body?.profile?.email || req.query.email || 'current_user@studentsavings.app') as string;
    req.userId = 'current_user';
    return next();
  }

  // 2. Otherwise verify JWT
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string };
    req.userEmail = decoded.email;
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Session expirée ou token invalide.' });
  }
};

export const syncRouter = Router();

// POST /api/backup
syncRouter.post('/backup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const email = req.userEmail || body.profile?.email || 'student@campus.app';
    const userId = req.userId || 'usr_default';

    const saved = dbService.saveBackup(email, userId, body);

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
  } catch (err: any) {
    console.error('[backup Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la sauvegarde.' });
  }
});

// GET /api/restore
syncRouter.get('/restore', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.userEmail || (req.query.email as string);
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis pour la restauration.' });
    }

    const backup = dbService.getBackup(email);
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
  } catch (err: any) {
    console.error('[restore Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la restauration.' });
  }
});

// POST /api/sync (Incremental queue sync)
syncRouter.post('/sync', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;
    return res.json({
      success: true,
      synced: Array.isArray(items) ? items.length : 0
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
