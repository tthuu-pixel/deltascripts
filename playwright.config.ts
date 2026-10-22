import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: 'node --import tsx tests/e2e-server.ts',
      url: 'http://127.0.0.1:3101/api/health',
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev:web -- --port=3100',
      url: 'http://127.0.0.1:3100',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
      reuseExistingServer: false,
    },
  ],
});
