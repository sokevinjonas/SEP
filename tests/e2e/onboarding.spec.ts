import { test, expect } from '@playwright/test';
import { clearAllLocalData } from '../helpers/idb-helper';

test.describe('E2E - Student Onboarding & Registration Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test to guarantee fresh student state
    await clearAllLocalData(page);
  });

  test('should guide a new student through onboarding to home dashboard', async ({ page }) => {
    // 1. Visit root - guard redirects to /onboarding
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/onboarding/);

    // 2. Check Welcome Screen elements
    await expect(page.locator('.hero-title')).toBeVisible();
    await expect(page.locator('#btn-get-started')).toBeVisible();

    // 3. Click Get Started -> redirects to /register
    await page.locator('#btn-get-started').click();
    await expect(page).toHaveURL(/.*\/register/);

    // 4. Step 1: Fill Campus Profile
    await expect(page.locator('.sep-page-title')).toContainText('Campus Profile');

    // Fill Student Name (using native input inside ion-input)
    const nameInput = page.locator('ion-input[placeholder*="Kwame"] input');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill('Jonas');

    // Fill Campus if needed or keep default
    const campusInput = page.locator('ion-input[placeholder*="University of Ghana"] input');
    await campusInput.fill('University of Ghana (Legon)');

    // Proceed to Step 2
    const nextBtn = page.locator('#btn-next-step-1');
    await nextBtn.click();

    // 5. Step 2: Cycle & Discovery Setup
    await expect(page.locator('.sep-page-title')).toContainText('Budget & Rates');
    await expect(page.locator('text=30-Day Discovery Active')).toBeVisible();

    // Complete registration
    const completeBtn = page.locator('#btn-complete-register');
    await completeBtn.click();

    // 6. Should arrive on Home Dashboard
    await expect(page).toHaveURL(/.*\/tabs\/home/);
    await expect(page.locator('.user-name')).toContainText('Jonas');
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();
  });
});
