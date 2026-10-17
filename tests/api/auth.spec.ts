import { test, expect } from '@playwright/test';

test.describe('Auth API (/api/auth)', () => {
  const testEmail = `student_${Date.now()}@campus.edu`;

  test('POST /api/auth/send-otp - should reject invalid or missing email', async ({ request }) => {
    // Missing email
    const resEmpty = await request.post('/api/auth/send-otp', {
      data: {}
    });
    expect(resEmpty.status()).toBe(400);
    const bodyEmpty = await resEmpty.json();
    expect(bodyEmpty.success).toBe(false);
    expect(bodyEmpty.error).toContain('valid email address is required');

    // Invalid email without @
    const resInvalid = await request.post('/api/auth/send-otp', {
      data: { email: 'invalid-email-address' }
    });
    expect(resInvalid.status()).toBe(400);
    const bodyInvalid = await resInvalid.json();
    expect(bodyInvalid.success).toBe(false);
  });

  test('POST /api/auth/send-otp - should send OTP and return devCode in development', async ({ request }) => {
    const res = await request.post('/api/auth/send-otp', {
      data: { email: testEmail }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.email).toBe(testEmail.toLowerCase());
    expect(body.devCode).toBeDefined();
    expect(typeof body.devCode).toBe('string');
    expect(body.devCode.length).toBe(6);
  });

  test('POST /api/auth/verify-otp - should reject invalid OTP code', async ({ request }) => {
    const res = await request.post('/api/auth/verify-otp', {
      data: {
        email: testEmail,
        code: '999999' // Invalid code
      }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid or expired verification code');
  });

  test('POST /api/auth/verify-otp - should authenticate with valid OTP and return JWT token', async ({ request }) => {
    // 1. Request OTP
    const otpRes = await request.post('/api/auth/send-otp', {
      data: { email: testEmail }
    });
    const { devCode } = await otpRes.json();

    // 2. Verify OTP
    const verifyRes = await request.post('/api/auth/verify-otp', {
      data: {
        email: testEmail,
        code: devCode
      }
    });

    expect(verifyRes.status()).toBe(200);
    const body = await verifyRes.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail.toLowerCase());
  });
});
