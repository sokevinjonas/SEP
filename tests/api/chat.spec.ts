import { test, expect } from '@playwright/test';

test.describe('Chat API (/api/chat - M. Pognon Financial Coach)', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const email = `chat_test_${Date.now()}@campus.edu`;
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

  test('POST /api/chat - should return 401 when unauthorized', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { message: 'How do I save money?' }
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/chat - should return 400 when message is empty or missing', async ({ request }) => {
    const res = await request.post('/api/chat', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {}
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Message is required');
  });

  test('POST /api/chat - should return coaching advice in English for impulse purchase query', async ({ request }) => {
    const res = await request.post('/api/chat', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        message: 'I want to buy new sneakers for campus party',
        context: {
          studentName: 'Kwame',
          balance: 240.0,
          currency: 'GHS'
        }
      }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reply).toBeDefined();
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(10);
    // Should advise on cool-off or meals
    expect(body.reply.toLowerCase()).toMatch(/hesitation|cool-off|meals|pause|budget/);
  });

  test('POST /api/chat - should return coaching advice in French when queried in French', async ({ request }) => {
    const res = await request.post('/api/chat', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        message: 'Bonjour M. Pognon, je veux acheter des chaussures chères',
        context: {
          studentName: 'Jonas',
          balance: 180.0,
          currency: 'GHS'
        }
      }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reply).toBeDefined();
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(10);
    expect(body.reply.toLowerCase()).toMatch(/budget|pause|achats|repas/);
  });
});
