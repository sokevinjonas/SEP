import { test, expect } from '@playwright/test';
import { seedOnboardedUser } from '../helpers/idb-helper';

test.describe('E2E - Considered Purchases & Anti-Impulse Hesitation', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedUser(page);
  });

  test('should trigger hesitation screen and pause an impulse purchase for 48h', async ({ page }) => {
    // 1. On Home dashboard, click "I want to buy"
    await expect(page.locator('#btn-want-to-buy')).toBeVisible();
    await page.locator('#btn-want-to-buy').click();

    // 2. Hesitation Step 1: Input details
    await expect(page.locator('text=Spotted an item you want?')).toBeVisible();

    const titleInput = page.locator('.title-field input');
    await titleInput.fill('Noise Canceling Headphones');

    const amountInput = page.locator('.amount-field input');
    await amountInput.fill('100');

    // Select category
    const catChip = page.locator('.category-select-chip').first();
    await catChip.click();

    // 3. Click "Confront my budget"
    const evaluateBtn = page.locator('#btn-evaluate-purchase');
    await evaluateBtn.click();

    // 4. Hesitation Step 2: Budget Shock & Reframing
    await expect(page.locator('text=Cooling-Off Pause (Anti-Impulse)')).toBeVisible();
    await expect(page.locator('.shock-number-badge')).toBeVisible();
    await expect(page.locator('.coach-speech-bubble')).toBeVisible();

    // 5. Choose "I'll think about it" (Cooling-off pause)
    const thinkBtn = page.locator('#btn-think-about-it');
    await thinkBtn.click();

    // Modal closes
    await expect(page.locator('.hesitation-modal-sheet')).not.toBeVisible();

    // 6. Navigate to Considered Purchases (/tabs/purchases)
    await page.goto('/tabs/purchases');
    await expect(page.locator('.sep-toolbar-title')).toHaveText('Considered Purchases');
    await expect(page.locator('.item-title').filter({ hasText: 'Noise Canceling Headphones' })).toBeVisible();
    await expect(page.locator('.btn-abandon')).toBeVisible();

    // 7. Test "Abandon & Save" to celebrate impulse resistance
    await page.locator('.btn-abandon').click();
    await page.getByRole('button', { name: "Yes, I won't buy it!" }).click();

    // Switch to Avoided (Abandoned) tab
    await page.locator('ion-segment-button[value="abandoned"]').click();
    await expect(page.locator('text=Successfully Avoided')).toBeVisible();
    await expect(page.locator('.avoided-hero-banner')).toBeVisible();
  });
});
