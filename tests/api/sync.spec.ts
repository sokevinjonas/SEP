import { test, expect } from '@playwright/test';

test.describe('Sync & Backup API (/api/backup, /api/restore, /api/sync)', () => {
  let authToken = '';
  const testEmail = `sync_student_${Date.now()}@campus.edu`;

  test.beforeAll(async ({ request }) => {
    // Authenticate via OTP to get a valid JWT token
    const otpRes = await request.post('/api/auth/send-otp', {
      data: { email: testEmail }
    });
    const { devCode } = await otpRes.json();

    const verifyRes = await request.post('/api/auth/verify-otp', {
      data: { email: testEmail, code: devCode }
    });
    const data = await verifyRes.json();
    authToken = data.token;
  });

  test('POST /api/backup - should return 401 when missing Authorization header', async ({ request }) => {
    const res = await request.post('/api/backup', {
      data: { expenses: [], purchases: [], categories: [] }
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /api/backup - should save cloud backup successfully with valid JWT', async ({ request }) => {
    const backupPayload = {
      profile: {
        id: 'current_user',
        name: 'Jonas Dev',
        email: testEmail,
        country: 'Ghana',
        city: 'Accra',
        primaryCurrency: 'GHS'
      },
      monthlyBudget: {
        id: '2026-10',
        totalBudgetGhs: 600,
        exchangeRateXof: 42.0
      },
      categories: [
        { id: 'cat-food', name: 'Food & Chop', monthlyAllocationGhs: 300 }
      ],
      expenses: [
        { id: 'exp-1', amount: 15.5, categoryId: 'cat-food', merchant: 'Campus Chop Bar' }
      ],
      purchases: []
    };

    const res = await request.post('/api/backup', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: backupPayload
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
    expect(body.stats.expenses).toBe(1);
    expect(body.stats.categories).toBe(1);
    expect(body.updatedAt).toBeDefined();
  });

  test('GET /api/restore - should return 401 when unauthorized', async ({ request }) => {
    const res = await request.get('/api/restore');
    expect(res.status()).toBe(401);
  });

  test('GET /api/restore - should retrieve backed-up data successfully', async ({ request }) => {
    const res = await request.get('/api/restore', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile).toBeDefined();
    expect(body.profile.email).toBe(testEmail);
    expect(body.expenses).toHaveLength(1);
    expect(body.expenses[0].merchant).toBe('Campus Chop Bar');
  });

  test('POST /api/sync - should accept incremental queue synchronization', async ({ request }) => {
    const syncItems = [
      { id: 'sync-1', action: 'create', entity: 'expense', payload: { id: 'exp-2', amount: 8.0 } },
      { id: 'sync-2', action: 'update', entity: 'purchase', payload: { id: 'pur-1', status: 'abandoned' } }
    ];

    const res = await request.post('/api/sync', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { items: syncItems }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.synced).toBe(2);
  });
});
