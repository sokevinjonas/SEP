import { test, expect } from '@playwright/test';
import { seedOnboardedUser } from '../helpers/idb-helper';

test.describe('E2E - Budget & Category Envelopes Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedUser(page);
  });

  test('should display budget overview, coach banner and category envelopes', async ({ page }) => {
    // 1. Navigate to Budget tab
    await page.locator('#tab-btn-budget').click();
    await expect(page).toHaveURL(/.*\/tabs\/budget/);

    // 2. Check header and coach banner
    await expect(page.locator('.sep-page-title')).toHaveText('Budget Envelopes');
    await expect(page.locator('#btn-talk-to-pognon')).toBeVisible();

    // 3. Check envelopes grid or categories
    await expect(page.locator('text=Category Envelope Allocations')).toBeVisible();
    await expect(page.locator('.env-name').filter({ hasText: 'Food & Chop' })).toBeVisible();
    await expect(page.locator('.env-name').filter({ hasText: 'Transport & Trotro' })).toBeVisible();

    // 4. Click an envelope to open Category Detail
    const foodEnvelope = page.locator('.envelope-card').filter({ hasText: 'Food & Chop' });
    await foodEnvelope.click();

    // 5. Verify Category Detail page
    await expect(page).toHaveURL(/.*\/category/);
    await expect(page.locator('.hero-name', { hasText: 'Food & Chop' })).toBeVisible();
  });
});
