import { test, expect } from '@playwright/test';
import { seedOnboardedUser } from '../helpers/idb-helper';

test.describe('E2E - Rapid 3-Tap Expense Logging', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedUser(page);
  });

  test('should log a campus expense in 3 taps and update ledger', async ({ page }) => {
    // 1. On Home dashboard, verify quick action dock is visible
    await expect(page.locator('#btn-quick-log')).toBeVisible();

    // 2. Tap 1: Open Quick Log modal
    await page.locator('#btn-quick-log').click();
    await expect(page.locator('.modal-title')).toHaveText('Quick Expense');

    // 3. Tap 2: Select amount (using +20 quick chip: 15 default + 20 = 35)
    const chip20 = page.locator('.quick-chip').filter({ hasText: '+20' });
    await chip20.click();
    await expect(page.locator('.amount-number')).toHaveText('35');

    // 4. Tap 3: Select category (Food & Chop)
    const foodCat = page.locator('.cat-chip').filter({ hasText: 'Food & Chop' });
    await foodCat.click();
    await expect(foodCat).toHaveClass(/selected/);

    // Optional: Add note
    const merchantInput = page.locator('.merchant-input input');
    await merchantInput.fill('Campus Dining Hall');

    // Confirm & Save
    const saveBtn = page.locator('#btn-confirm-save');
    await saveBtn.click();

    // Modal should close
    await expect(page.locator('.modal-title')).not.toBeVisible();

    // 5. Verify the expense appears in the Recent Expenses ledger on Home
    await expect(page.locator('text=Campus Dining Hall')).toBeVisible();
    await expect(page.locator('text=-35.00 GHS')).toBeVisible();
  });

  test('should display logged expenses in the full expenses timeline page', async ({ page }) => {
    // Log an expense first
    await page.locator('#btn-quick-log').click();
    await page.locator('.quick-chip').filter({ hasText: '+10' }).click();
    await page.locator('.cat-chip').filter({ hasText: 'Transport & Trotro' }).click();
    await page.locator('.merchant-input input').fill('Trotro Legon Gate');
    await page.locator('#btn-confirm-save').click();
    await expect(page.locator('.modal-title')).not.toBeVisible();

    // Navigate to All Expenses page
    await page.goto('/tabs/expenses');
    await expect(page.locator('.sep-toolbar-title')).toHaveText('All Expenses');
    await expect(page.locator('text=Trotro Legon Gate')).toBeVisible();
    await expect(page.locator('.amount-main').filter({ hasText: '-25.00 GHS' })).toBeVisible();
  });
});
