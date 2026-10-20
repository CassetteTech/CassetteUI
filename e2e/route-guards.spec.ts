import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
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

  test('carries a saved auth redirect into a sign-in finished in another tab', async ({
    page,
    context,
  }) => {
    await mockCassetteApp(page);
    await page.goto('/auth/signup?redirect=/promote/new');

    const secondTab = await context.newPage();
    await mockCassetteApp(secondTab, { googleAuthUser: fixtureUsers.member });
    await secondTab.goto('/auth/signin');
    await secondTab.getByRole('button', { name: 'Continue with Google' }).click();

    await expect(secondTab).toHaveURL('/promote/new');
  });

  test('redirects the short /@handle address to the profile', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/@miagroove');
    await expect(page).toHaveURL(/\/profile\/miagroove(?:\?|$)/);

    const response = await page.goto('/@not.a.handle');
    expect(response?.status()).toBe(404);
    await expect(page).not.toHaveURL(/\/profile\//);
  });

  test('sends /auth/login to sign-in and returns only to a safe local destination', async ({ page }) => {
    await mockCassetteApp(page, { googleAuthUser: fixtureUsers.member });

    await page.goto('/auth/login?redirect=/studio/music/new');
    await expect(page).toHaveURL((url) =>
      url.pathname === '/auth/signin' && url.searchParams.get('redirect') === '/studio/music/new');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/studio/music/new');
  });

  test('ignores an external redirect that arrives through /auth/login', async ({ page }) => {
    await mockCassetteApp(page, { googleAuthUser: fixtureUsers.member });

    await page.goto('/auth/login?redirect=https://evil.example/steal');
    await expect(page).toHaveURL((url) => url.pathname === '/auth/signin');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/studio/music');
  });

  test('returns a visitor from a signed-in-only page to that page after sign-in', async ({ page }) => {
    await mockCassetteApp(page, { googleAuthUser: fixtureUsers.member });

    await page.goto('/memberships');
    await expect(page).toHaveURL('/auth/signin?redirect=%2Fmemberships');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/memberships');
  });

  test('keeps the current page in the navbar and sidebar sign-in links', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockCassetteApp(page, { posts: [fixturePosts.publicTrack] });

    await page.goto('/post/post-public-track');
    await expect(page.getByRole('link', { name: 'Sign In', exact: true }).filter({ visible: true }))
      .toHaveAttribute('href', '/auth/signin?redirect=%2Fpost%2Fpost-public-track');

    await page.goto('/explore');
    const signInLinks = page.getByRole('link', { name: 'Sign In', exact: true }).filter({ visible: true });
    await expect(signInLinks.first()).toBeVisible();
    for (const link of await signInLinks.all()) {
      await expect(link).toHaveAttribute('href', '/auth/signin?redirect=%2Fexplore');
    }
    for (const link of await page.getByRole('link', { name: 'Sign Up', exact: true }).filter({ visible: true }).all()) {
      await expect(link).toHaveAttribute('href', '/auth/signup?redirect=%2Fexplore');
    }
  });

  test('sends onboarded Google callback users to Curator Studio when no redirect is stored', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
    });

    await page.goto('/auth/google/callback');
    await expect(page).toHaveURL('/studio/music');
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
    await page.goto('/auth/signin?redirect=/studio/music/new');
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
    await expect(page).toHaveURL('/auth/signin?error=oauth-error&redirect=%2Fstudio%2Fmusic%2Fnew');
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
    await expect(page.getByTestId('auth-error-message')).not.toContainText('configuration');

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/studio/music/new');
  });

  test('preserves add-music intent when switching from sign in to sign up', async ({ page }) => {
    await mockCassetteApp(page, {
      googleAuthUser: fixtureUsers.member,
    });

    await page.goto('/auth/signin?redirect=/studio/music/new');
    await page.getByRole('link', { name: /Sign Up/ }).click();
    await expect(page).toHaveURL('/auth/signup?redirect=%2Fstudio%2Fmusic%2Fnew');

    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL('/studio/music/new');
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
});
