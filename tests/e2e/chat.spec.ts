import { test, expect } from '@playwright/test';
import { seedOnboardedUser } from '../helpers/idb-helper';

test.describe('E2E - M. Pognon In-App Financial Coach Chat', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedUser(page);
  });

  test('should open M. Pognon chat modal and receive financial advice', async ({ page }) => {
    // 1. On Home dashboard, click Coach M. Pognon card
    const coachCard = page.locator('#btn-home-coach-card');
    await expect(coachCard).toBeVisible();
    await coachCard.click();

    // 2. Chat modal opens
    await expect(page.locator('.chat-toolbar .coach-name')).toHaveText('M. Pognon');

    // 3. Type message into input
    const chatInput = page.locator('#input-chat-pognon input');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('How can I make my food budget last until the end of the month?');

    // 4. Send message
    const sendBtn = page.locator('#btn-send-message');
    await sendBtn.click();

    // 5. Verify user bubble and response bubble appear
    await expect(page.locator('.message-row.is-user')).toBeVisible();
    await expect(page.locator('.message-row.is-pognon').first()).toBeVisible({ timeout: 10000 });

    // 6. Close chat modal
    const closeBtn = page.locator('#btn-close-chat');
    await closeBtn.click();
    await expect(page.locator('.chat-toolbar .coach-name')).not.toBeVisible();
  });
});
