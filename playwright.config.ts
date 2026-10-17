import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        baseURL: 'http://localhost:4200',
        ...devices['Desktop Chrome'],
        viewport: { width: 412, height: 915 }, // Mobile viewport (Pixel 7 style) for Ionic
      },
    },
  ],
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npx ng serve',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
