import { test, expect } from '@playwright/test';

test.describe('Captures & Alerts API (/api/captures, /api/alerts, /api/email)', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const email = `captures_test_${Date.now()}@campus.edu`;
    const otpRes = await request.post('/api/auth/send-otp', {
      data: { email }
    });
    const { devCode } = await otpRes.json();

    const verifyRes = await request.post('/api/auth/verify-otp', {
      data: { email, code: devCode }
    });
    const data = await verifyRes.json();
    authToken = data.token;
  });

  test('POST /api/captures - should return 401 when unauthorized', async ({ request }) => {
    const res = await request.post('/api/captures');
    expect(res.status()).toBe(401);
  });

  test('POST /api/captures - should return 400 when no image file is provided', async ({ request }) => {
    const res = await request.post('/api/captures', {
      headers: { Authorization: `Bearer ${authToken}` },
      multipart: { note: 'test capture' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('No image file provided');
  });

  test('POST /api/alerts/pending-purchase-reminder - should return 400 if parameters are missing', async ({ request }) => {
    const res = await request.post('/api/alerts/pending-purchase-reminder', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { email: 'student@campus.edu' } // Missing purchaseTitle
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/alerts/pending-purchase-reminder - should succeed with valid parameters', async ({ request }) => {
    const res = await request.post('/api/alerts/pending-purchase-reminder', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        email: 'student@campus.edu',
        purchaseTitle: 'Gaming Headphones',
        amountGhs: 120,
        costDays: 6,
        studentName: 'Jonas'
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /api/email/recap - should return 400 if email is missing', async ({ request }) => {
    const res = await request.post('/api/email/recap', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { balanceGhs: 150, budgetDays: 7 }
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/email/recap - should succeed with valid parameters', async ({ request }) => {
    const res = await request.post('/api/email/recap', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        email: 'student@campus.edu',
        balanceGhs: 320.50,
        budgetDays: 16,
        totalSpentToday: 18.00
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
