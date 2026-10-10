/** Verifies that a session outage is never read as a sign-out, and that a stale answer never restores an account. */

import { expect, type Page, test } from '@playwright/test';

import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const accountError = (page: Page) => page.getByText('Could not check your account');

/** Answers session reads with `status` while `failing()` is true; other reads use the shared mock. */
async function failSessionReads(page: Page, failing: () => number | null) {
  await page.route('**/api/auth/session', (route) => {
    const status = failing();
    return status === null ? route.fallback() : route.fulfill({ status, body: 'unavailable' });
  });
}

async function finishOnboarding(page: Page) {
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-username').fill('freshhandle');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await page.getByTestId('onboarding-handle-next').click();
  await page.getByTestId('onboarding-avatar-next').click();
  await page.getByTestId('onboarding-finish-setup').click();
}

test('browser session responses are private and never cached', async ({ page }) => {
  const response = await page.request.get('/api/auth/session');
  expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toBe('private, no-store');
});

test('a session that ends while onboarding saves is not restored by the profile response', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.newcomer });
  let profileSaved = false;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/api/v1/profile') profileSaved = true;
  });
  await page.route('**/api/auth/session', (route) =>
    profileSaved
      ? route.fulfill({ status: 401, json: { success: false, message: 'No authenticated session found' } })
      : route.fallback());

  await page.goto('/onboarding');
  await finishOnboarding(page);

  await expect(page).toHaveURL('/auth/signin');
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByText('Profile created successfully!')).toHaveCount(0);
});

test('a session outage after onboarding saves keeps the same account signed in and onboarded', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.newcomer });
  let profileSaved = false;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/api/v1/profile') profileSaved = true;
  });
  await failSessionReads(page, () => (profileSaved ? 503 : null));

  await page.goto('/onboarding');
  await finishOnboarding(page);

  await expect(page.getByText('Profile created successfully!')).toBeVisible();
  await expect(page).not.toHaveURL(/\/auth\/signin/);
});

test('a session outage on the Google callback offers a retry and keeps the return intent', async ({ page }) => {
  await mockCassetteApp(page, { googleAuthUser: fixtureUsers.member, myMemberships: [] });
  let outage = true;
  await page.route('**/api/auth/session', (route) => {
    const fromCallback = (route.request().headers()['referer'] ?? '').includes('/auth/google/callback');
    return outage && fromCallback ? route.fulfill({ status: 503, body: 'unavailable' }) : route.fallback();
  });

  await page.goto('/auth/signin?redirect=/memberships');
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(accountError(page)).toBeVisible();
  await expect(page).toHaveURL('/auth/google/callback');
  expect(await page.evaluate(() => localStorage.getItem('cassette_auth_redirect'))).toContain('/memberships');

  outage = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL('/memberships');
  await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
});

test('a session outage on the sign-in callback offers a retry instead of a failed sign-in', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, myMemberships: [] });
  await page.addInitScript(() => localStorage.setItem(
    'cassette_auth_redirect',
    JSON.stringify({ value: '/memberships', expiresAt: Date.now() + 600_000 }),
  ));
  let outage = true;
  await failSessionReads(page, () => (outage ? 503 : null));

  await page.goto('/auth/callback');

  await expect(accountError(page)).toBeVisible();
  await expect(page.getByText('Login Failed')).toHaveCount(0);
  outage = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL('/memberships');
});

test('a protected page offers a retry during a session outage instead of sending the viewer to sign in', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, myMemberships: [] });
  let outage = true;
  await failSessionReads(page, () => (outage ? 503 : null));

  await page.goto('/memberships');

  await expect(accountError(page)).toBeVisible();
  await expect(page).toHaveURL('/memberships');
  outage = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
});

test('the internal console does not deny access when its account check fails', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: { ...fixtureUsers.member, accountType: null } });
  let call = 0;
  await page.route('**/api/auth/session', async (route) => {
    call += 1;
    if (call === 2) return route.fulfill({ status: 503, body: 'unavailable' });
    return route.fulfill({
      json: {
        success: true,
        authenticated: true,
        activeMembershipCount: 0,
        user: {
          userId: fixtureUsers.member.id,
          username: fixtureUsers.member.username,
          displayName: fixtureUsers.member.displayName,
          isOnboarded: true,
          accountType: call >= 3 ? 'CassetteTeam' : null,
        },
      },
    });
  });

  await page.goto('/internal');

  await expect(accountError(page)).toBeVisible();
  await expect(page).toHaveURL('/internal');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Console', level: 1 })).toBeVisible();
});
