import { Env, SyncPayload, ChatRequest } from './types';
import { ResendService } from './services/resend';
import { OpenAIService } from './services/openai';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Health check (Public)
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'healthy', env: env.ENVIRONMENT || 'production', time: new Date().toISOString() });
    }

    // AD-6: Bearer token authentication required for all API routes
    const authHeader = request.headers.get('Authorization');
    const expectedToken = env.APP_SECRET_TOKEN || 'sep_secret_bearer_token_2026';
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedToken) {
      return jsonResponse({ error: 'Unauthorized: Invalid or missing Bearer token' }, 401);
    }

    try {
      // 1. POST /api/sync (Story 3.6 & Story 4.4)
      if (url.pathname === '/api/sync' && request.method === 'POST') {
        const payload: SyncPayload = await request.json();
        const resend = new ResendService(env);
        let syncedCount = 0;

        for (const item of payload.items || []) {
          if (item.type === 'expense' && (item.action === 'create' || item.action === 'update')) {
            const exp = item.payload;
            await env.DB.prepare(`
              INSERT INTO expenses (id, amount, currency, categoryId, categoryName, merchant, note, date, source, transactionRef, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                amount = excluded.amount,
                currency = excluded.currency,
                categoryId = excluded.categoryId,
                categoryName = excluded.categoryName,
                merchant = excluded.merchant,
                note = excluded.note,
                date = excluded.date,
                transactionRef = excluded.transactionRef
            `).bind(
              exp.id, exp.amount, exp.currency || 'GHS', exp.categoryId,
              exp.categoryName, exp.merchant, exp.note || '', exp.date,
              exp.source || 'manual', exp.transactionRef || null, exp.createdAt || new Date().toISOString()
            ).run();

            // Story 4.4: Check category threshold crossing in D1
            await checkCategoryThreshold(env, resend, exp.categoryId);
            syncedCount++;
          } else if (item.type === 'purchase' && (item.action === 'create' || item.action === 'update')) {
            const pur = item.payload;
            await env.DB.prepare(`
              INSERT INTO purchases (id, itemName, amountGhs, categoryId, status, createdAt, coolingOffExpiresAt, reminderSent)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                itemName = excluded.itemName,
                amountGhs = excluded.amountGhs,
                categoryId = excluded.categoryId,
                status = excluded.status
            `).bind(
              pur.id, pur.itemName, pur.amountGhs, pur.categoryId,
              pur.status, pur.createdAt, pur.coolingOffExpiresAt, 0
            ).run();
            syncedCount++;
          }
        }

        return jsonResponse({ success: true, synced: syncedCount });
      }

      // 1b. POST /api/backup (Full Cloud Backup)
      if (url.pathname === '/api/backup' && request.method === 'POST') {
        const body: any = await request.json();
        let expCount = 0;
        let purCount = 0;

        // Upsert Profile
        if (body.profile) {
          const p = body.profile;
          await env.DB.prepare(`
            INSERT INTO user_profiles (id, name, country, city, campus, primaryCurrency, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              country = excluded.country,
              city = excluded.city,
              campus = excluded.campus,
              primaryCurrency = excluded.primaryCurrency,
              updatedAt = excluded.updatedAt
          `).bind(
            p.id || 'current_user', p.name || 'Jonas', p.country || 'Ghana',
            p.city || 'Accra', p.campus || '', p.primaryCurrency || 'GHS',
            p.updatedAt || new Date().toISOString()
          ).run();
        }

        // Upsert Monthly Budget
        if (body.monthlyBudget) {
          const b = body.monthlyBudget;
          await env.DB.prepare(`
            INSERT INTO monthly_budgets (id, monthYear, totalBudgetGhs, plannedDailyBudgetGhs, exchangeRateXof)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              monthYear = excluded.monthYear,
              totalBudgetGhs = excluded.totalBudgetGhs,
              plannedDailyBudgetGhs = excluded.plannedDailyBudgetGhs,
              exchangeRateXof = excluded.exchangeRateXof
          `).bind(
            b.id || 'current', b.monthYear || 'current',
            b.totalBudgetGhs || 600, b.plannedDailyBudgetGhs || 20,
            b.exchangeRateXof || 42
          ).run();
        }

        // Upsert Categories
        if (Array.isArray(body.categories)) {
          for (const cat of body.categories) {
            await env.DB.prepare(`
              INSERT INTO categories (id, name, allocatedGhs, spentGhs, icon, color)
              VALUES (?, ?, ?, 0, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                allocatedGhs = excluded.allocatedGhs,
                icon = excluded.icon,
                color = excluded.color
            `).bind(
              cat.id, cat.name, cat.monthlyAllocationGhs || 0,
              cat.icon || 'folder-outline', cat.color || '#714B67'
            ).run();
          }
        }

        // Upsert Expenses
        if (Array.isArray(body.expenses)) {
          for (const exp of body.expenses) {
            await env.DB.prepare(`
              INSERT INTO expenses (id, amount, currency, categoryId, categoryName, merchant, note, date, source, transactionRef, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                amount = excluded.amount,
                currency = excluded.currency,
                categoryId = excluded.categoryId,
                categoryName = excluded.categoryName,
                merchant = excluded.merchant,
                note = excluded.note,
                date = excluded.date,
                transactionRef = excluded.transactionRef
            `).bind(
              exp.id, exp.amount, exp.currency || 'GHS', exp.categoryId,
              exp.categoryName, exp.merchant || '', exp.note || '', exp.date,
              exp.source || 'manual', exp.transactionRef || null, exp.createdAt || new Date().toISOString()
            ).run();
            expCount++;
          }
        }

        // Upsert Purchases
        if (Array.isArray(body.purchases)) {
          for (const pur of body.purchases) {
            await env.DB.prepare(`
              INSERT INTO purchases (id, itemName, amountGhs, categoryId, status, createdAt, coolingOffExpiresAt, reminderSent)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                itemName = excluded.itemName,
                amountGhs = excluded.amountGhs,
                categoryId = excluded.categoryId,
                status = excluded.status
            `).bind(
              pur.id, pur.itemName, pur.amountGhs, pur.categoryId,
              pur.status, pur.createdAt, pur.coolingOffExpiresAt || pur.expiresAt || new Date().toISOString(), 0
            ).run();
            purCount++;
          }
        }

        return jsonResponse({
          success: true,
          backedUpAt: new Date().toISOString(),
          stats: { expenses: expCount, purchases: purCount, categories: body.categories?.length || 0 }
        });
      }

      // 1c. GET /api/restore (Full Cloud Restore)
      if (url.pathname === '/api/restore' && request.method === 'GET') {
        const expenses = await env.DB.prepare(`SELECT * FROM expenses ORDER BY date DESC`).all();
        const purchases = await env.DB.prepare(`SELECT * FROM purchases ORDER BY createdAt DESC`).all();
        const categories = await env.DB.prepare(`SELECT * FROM categories`).all();
        const profile = await env.DB.prepare(`SELECT * FROM user_profiles WHERE id = 'current_user'`).first();
        const budget = await env.DB.prepare(`SELECT * FROM monthly_budgets ORDER BY id DESC LIMIT 1`).first();

        return jsonResponse({
          success: true,
          restoredAt: new Date().toISOString(),
          profile: profile || null,
          monthlyBudget: budget || null,
          categories: categories.results || [],
          expenses: expenses.results || [],
          purchases: purchases.results || []
        });
      }

      // 2. POST /api/captures (Story 3.2 & Story 3.3)
      if (url.pathname === '/api/captures' && request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return jsonResponse({ error: 'Expected multipart/form-data' }, 400);
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
          return jsonResponse({ error: 'No file provided in form data' }, 400);
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const captureId = `cap-${crypto.randomUUID()}`;
        const r2Key = `captures/${captureId}.${ext}`;

        // Stream into Cloudflare R2
        await env.CAPTURES_BUCKET.put(r2Key, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        // Record in D1
        await env.DB.prepare(`
          INSERT INTO captures (id, r2Key, fileName, fileSizeKb, mimeType, createdAt)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).bind(captureId, r2Key, file.name, Math.round(file.size / 1024), file.type).run();

        // Convert to Base64 for OpenAI vision extraction
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const openai = new OpenAIService(env);
        const extracted = await openai.extractReceiptVision(base64, file.type);

        return jsonResponse({
          captureId,
          r2Key,
          extracted
        });
      }

      // 3. POST /api/chat (Story 4.1 & Story 4.2)
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const openai = new OpenAIService(env);
        if (await openai.isBudgetExceeded()) {
          return jsonResponse({
            reply: "M. Pognon a atteint sa limite d'énergie mensuelle ($5 budget guardrail). Il se repose pour préserver votre facture !",
            energyWarning: true
          }, 429);
        }

        const body: ChatRequest = await request.json();
        const userMessage = body.message || '';

        // Query D1 for concise financial summary (AD-7 Aggregated summary)
        const summary = await buildFinancialSummary(env);
        const reply = await openai.chatWithPognon(userMessage, summary);

        return jsonResponse({ reply });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err: any) {
      console.error('[Worker API Error]', err);
      return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
    }
  },

  // Cron handler for Story 4.5 & Story 4.6
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const hour = new Date(event.scheduledTime).getUTCHours();
    const resend = new ResendService(env);

    // 06:00 UTC Morning Recap
    if (hour === 6) {
      await handleMorningRecapCron(env, resend);
    }

    // 22:00 UTC Evening Recap
    if (hour === 22) {
      await handleEveningRecapCron(env, resend);
    }

    // Hourly: 24h Cooling-Off follow-up email check
    await handleCoolingOffCron(env, resend);
  }
};

// Helper: Threshold crossing evaluation (Story 4.4)
async function checkCategoryThreshold(env: Env, resend: ResendService, categoryId: string): Promise<void> {
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const category = await env.DB.prepare(
    'SELECT name, allocatedGhs FROM categories WHERE id = ?'
  ).bind(categoryId).first<{ name: string; allocatedGhs: number }>();

  if (!category || category.allocatedGhs <= 0) return;

  const sumResult = await env.DB.prepare(`
    SELECT SUM(amount) as totalSpent
    FROM expenses
    WHERE categoryId = ? AND strftime('%Y-%m', date) = ?
  `).bind(categoryId, currentMonthKey).first<{ totalSpent: number }>();

  const spent = sumResult?.totalSpent || 0;
  const percentage = (spent / category.allocatedGhs) * 100;

  const thresholds: Array<70 | 90 | 100> = [70, 90, 100];
  for (const t of thresholds) {
    if (percentage >= t) {
      // Check if alert already sent for this month, category, and threshold level
      const alertExists = await env.DB.prepare(`
        SELECT id FROM threshold_alerts
        WHERE monthKey = ? AND categoryId = ? AND threshold = ?
      `).bind(currentMonthKey, categoryId, t).first();

      if (!alertExists) {
        // Send email via Resend
        await resend.sendThresholdAlert(category.name, t, spent, category.allocatedGhs);
        // Record alert
        await env.DB.prepare(`
          INSERT INTO threshold_alerts (id, monthKey, categoryId, threshold, alertSentAt)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).bind(`alt-${crypto.randomUUID()}`, currentMonthKey, categoryId, t).run();
      }
    }
  }
}

// Helper: Build aggregated financial summary for LLM prompt (AD-7)
async function buildFinancialSummary(env: Env): Promise<string> {
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const totalSpentRow = await env.DB.prepare(`
    SELECT SUM(amount) as total FROM expenses WHERE strftime('%Y-%m', date) = ?
  `).bind(currentMonthKey).first<{ total: number }>();

  const totalSpent = totalSpentRow?.total || 0;
  const plannedBudget = 600.0; // Standard monthly ceiling
  const balance = Math.max(0, plannedBudget - totalSpent);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate());
  const dailyAllowance = balance / daysLeft;

  const pendingPurchases = await env.DB.prepare(`
    SELECT itemName, amountGhs FROM purchases WHERE status = 'pending' ORDER BY createdAt DESC LIMIT 3
  `).all<{ itemName: string; amountGhs: number }>();

  const pendingText = pendingPurchases.results?.length
    ? pendingPurchases.results.map(p => `${p.itemName} (${p.amountGhs} GHS)`).join(', ')
    : 'Aucun';

  return `
- Budget mensuel alloué : ${plannedBudget} GHS
- Dépensé ce mois-ci : ${totalSpent.toFixed(2)} GHS
- Solde disponible : ${balance.toFixed(2)} GHS
- Jours restants : ${daysLeft} jours
- Allocation quotidienne respiratoire : ${dailyAllowance.toFixed(2)} GHS/jour
- Derniers achats en réflexion 48h : ${pendingText}
  `.trim();
}

// Cron handler: Morning Recap (Story 4.5)
async function handleMorningRecapCron(env: Env, resend: ResendService): Promise<void> {
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const totalSpentRow = await env.DB.prepare(`
    SELECT SUM(amount) as total FROM expenses WHERE strftime('%Y-%m', date) = ?
  `).bind(currentMonthKey).first<{ total: number }>();

  const totalSpent = totalSpentRow?.total || 0;
  const balance = Math.max(0, 600 - totalSpent);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate());
  const dailyAllowance = balance / daysLeft;

  const pendingCountRow = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM purchases WHERE status = 'pending'
  `).first<{ count: number }>();

  await resend.sendMorningRecap(dailyAllowance, balance, daysLeft, pendingCountRow?.count || 0, false);
}

// Cron handler: Evening Recap (Story 4.5)
async function handleEveningRecapCron(env: Env, resend: ResendService): Promise<void> {
  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthKey = todayStr.substring(0, 7);

  const todaySpentRow = await env.DB.prepare(`
    SELECT SUM(amount) as total FROM expenses WHERE date(date) = date(?)
  `).bind(todayStr).first<{ total: number }>();

  const monthSpentRow = await env.DB.prepare(`
    SELECT SUM(amount) as total FROM expenses WHERE strftime('%Y-%m', date) = ?
  `).bind(currentMonthKey).first<{ total: number }>();

  const avoidedRow = await env.DB.prepare(`
    SELECT SUM(amountGhs) as total FROM purchases WHERE status = 'abandoned'
  `).first<{ total: number }>();

  await resend.sendEveningRecap(
    todaySpentRow?.total || 0,
    monthSpentRow?.total || 0,
    avoidedRow?.total || 0,
    false
  );
}

// Cron handler: 24h Cooling-Off follow-up (Story 4.6)
async function handleCoolingOffCron(env: Env, resend: ResendService): Promise<void> {
  // Find purchases marked pending where created_at is > 24 hours ago and reminderSent == 0
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const candidates = await env.DB.prepare(`
    SELECT id, itemName, amountGhs
    FROM purchases
    WHERE status = 'pending'
      AND reminderSent = 0
      AND createdAt <= ?
  `).bind(twentyFourHoursAgo).all<{ id: string; itemName: string; amountGhs: number }>();

  for (const pur of candidates.results || []) {
    const success = await resend.sendCoolingOffReminder(pur.itemName, pur.amountGhs);
    if (success) {
      await env.DB.prepare(`
        UPDATE purchases SET reminderSent = 1 WHERE id = ?
      `).bind(pur.id).run();
    }
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
