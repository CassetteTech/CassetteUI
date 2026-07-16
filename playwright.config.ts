import { defineConfig, devices } from '@playwright/test';

const PORT = 3101;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Next's production server calls back into the local E2E proxy while
  // rendering metadata. Serialize the suite so a cold server cannot exhaust
  // itself before Playwright's browser-level fixtures handle the page.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'npm run serve:e2e',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_DIST_DIR: '.next-e2e',
      NEXTAUTH_URL: baseURL,
      PLAYWRIGHT_TEST: 'true',
      NEXT_PUBLIC_APP_DOMAIN: baseURL,
      NEXT_PUBLIC_API_URL_LOCAL: baseURL,
      NEXT_PUBLIC_ENABLE_LAMBDA_WARMUP: 'false',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_e2e_test',
      NEXT_PUBLIC_POSTHOG_CAPTURE_HOST: '/api/e2e-ingest',
    },
  },
});
