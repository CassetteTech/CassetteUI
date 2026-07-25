import { expect, test } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';

/**
 * While email/password auth is disabled (Google-only), the password reset
 * routes are parked behind redirects in next.config.ts — a password set there
 * could never be used to sign in. These tests pin the redirects; when email
 * auth returns, replace them with real coverage of the reset flow (request,
 * token validation, and the promote-to-full-session happy path).
 */
test.describe('password reset (parked while email auth is disabled)', () => {
  test('redirects /auth/forgot-password to sign-in', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/auth/forgot-password');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('redirects /auth/reset to sign-in, including old emailed links', async ({ page }) => {
    await mockCassetteApp(page);

    // Hash fragments survive redirects client-side; the token is simply unused.
    await page.goto('/auth/reset#access_token=stale&refresh_token=stale');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByPlaceholder('Create a strong password')).toHaveCount(0);
  });
});
