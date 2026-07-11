import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test.describe('route guards and auth redirects', () => {
  test('redirects anonymous visitors away from /profile', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/profile');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('redirects newcomers from /profile into onboarding', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.newcomer,
    });

    await page.goto('/profile');
    await expect(page).toHaveURL('/onboarding');
  });

  test('redirects onboarded users from /profile to their canonical profile url', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
    });

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  });

  test('redirects /profile/edit to the canonical edit route', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
    });

    await page.goto('/profile/edit');
    await expect(page).toHaveURL('/profile/miagroove/edit');
  });

  test('redirects anonymous visitors from /internal to sign in with the return route', async ({
    page,
  }) => {
    await mockCassetteApp(page);

    await page.goto('/internal');
    await expect(page).toHaveURL('/auth/signin?redirect=/internal');
  });

  test('sends onboarded Google callback users to their profile when no redirect is stored', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
    });

    await page.goto('/auth/google/callback');
    await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  });

  test('sends newcomer Google callback users into onboarding', async ({ page }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.newcomer,
    });

    await page.goto('/auth/google/callback');
    await expect(page).toHaveURL('/onboarding');
  });

  test('returns OAuth errors to sign-in with the expected query param', async ({ page }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
      googleAuthInitFailures: 1,
    });
    await page.goto('/auth/signin?redirect=/add-music');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await page.evaluate(() => {
      sessionStorage.setItem('cassette_pending_action', JSON.stringify({
        type: 'create_playlist',
        platform: 'spotify',
        playlistId: 'playlist-stale',
        returnUrl: '/post/post-stale',
        timestamp: Date.now(),
      }));
    });

    await page.goto('/auth/google/callback?error=access_denied');
    await expect(page).toHaveURL('/auth/signin?error=oauth-error&redirect=%2Fadd-music');
    await expect(page.getByTestId('auth-error-message')).toContainText(
      'Google sign-in was canceled or could not be completed. Please try again.',
    );
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
      .toBeNull();

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.getByTestId('auth-error-message')).toContainText(
      'We could not start Google sign-in. Please try again.',
    );

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/add-music');
  });

  test('preserves add-music intent when switching from sign in to sign up', async ({ page }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
    });

    await page.goto('/auth/signin?redirect=/add-music');
    await page.getByRole('link', { name: /Sign Up/ }).click();
    await expect(page).toHaveURL('/auth/signup?redirect=%2Fadd-music');

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/add-music');
  });

  test('shows a retryable error when Google sign-in cannot start', async ({ page }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
      googleAuthInitFailures: 1,
    });

    await page.goto('/auth/signin?redirect=/add-music');
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    await expect(page.getByTestId('auth-error-message')).toContainText(
      'We could not start Google sign-in. Please try again.',
    );
    await expect(page.getByTestId('auth-error-message')).not.toContainText('configuration');

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/add-music');
  });

  test('keeps playlist resume intent while a newcomer completes onboarding', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.newcomer,
    });
    await page.addInitScript(() => {
      sessionStorage.setItem('cassette_pending_action', JSON.stringify({
        type: 'create_playlist',
        platform: 'spotify',
        playlistId: 'playlist-onboarding',
        returnUrl: '/post/post-source-playlist',
        timestamp: Date.now(),
      }));
    });

    await page.goto('/auth/callback');

    await expect(page).toHaveURL('/onboarding');
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
      .not.toBeNull();
  });

  test('returns an onboarded add-music visitor to /add-music after Google auth', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
    });

    await page.goto('/add-music');
    await expect(page).toHaveURL('/auth/signin?redirect=/add-music');

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/add-music');
    await expect(page.locator('[data-testid="add-music-input"]:visible')).toBeVisible();
  });
});
