import { dbService, UserBackup } from './db.service.js';
import { emailService } from './email.service.js';

export class ReminderService {
  /**
   * Run the full scheduled reminder check:
   * 1. 24h Hesitation check for pending purchases
   * 2. Daily budget snapshot digest
   */
  async runScheduledTasks(): Promise<{
    status: string;
    remindersSent: number;
    digestsSent: number;
    totalUsersChecked: number;
  }> {
    console.log('[ReminderService] Starting scheduled tasks execution...');
    const backups: UserBackup[] = dbService.getAllBackups();
    let remindersSent = 0;
    let digestsSent = 0;

    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    for (const backup of backups) {
      const email = backup.email;
      const data = backup.data || {};
      const studentName = data.profile?.name || 'Student';

      // 1. Check for Pending Purchases (Hesitation List) older than 24h
      const purchases = Array.isArray(data.purchases) ? data.purchases : [];
      for (const p of purchases) {
        if (p.status === 'pending' && p.createdAt) {
          const createdTime = new Date(p.createdAt).getTime();
          // If pending for >= 24h and hasn't been notified yet
          if (now - createdTime >= TWENTY_FOUR_HOURS_MS && !p.reminderSentAt) {
            const success = await emailService.sendHesitationReminderEmail(email, studentName, {
              title: p.title || 'Considered Item',
              price: p.priceGhs || p.amount || 0,
              currency: p.currency || 'GHS',
              createdAt: p.createdAt
            });

            if (success) {
              p.reminderSentAt = new Date().toISOString();
              remindersSent++;
            }
          }
        }
      }

      // 2. Daily Digest (Compute remaining balance & safe daily rate)
      const budget = data.monthlyBudget || data.budget;
      const expenses = Array.isArray(data.expenses) ? data.expenses : [];
      const totalBudget = budget?.totalBudgetGhs || 600;
      const totalSpent = expenses.reduce((sum: number, e: any) => sum + (Number(e.amountGhs || e.amount) || 0), 0);
      const balance = Math.max(0, totalBudget - totalSpent);
      const currency = budget?.currency || 'GHS';
      const safeDaily = Math.round(balance / 30);

      const digestSent = await emailService.sendDailyDigestEmail(email, studentName, {
        balance: Math.round(balance),
        currency,
        spentToday: 0,
        safeDaily: safeDaily > 0 ? safeDaily : 15
      });

      if (digestSent) {
        digestsSent++;
      }
    }

    console.log(`[ReminderService] Scheduled run complete. Checked ${backups.length} users, sent ${remindersSent} reminders, ${digestsSent} digests.`);

    return {
      status: 'completed',
      remindersSent,
      digestsSent,
      totalUsersChecked: backups.length
    };
  }
}

export const reminderService = new ReminderService();
