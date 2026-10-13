import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('names the product in the first screen and gives each audience a next step', async ({ page }) => {
    await mockCassetteApp(page);
    await page.goto('/');

    await expect(page.locator('h1')).toHaveText(/Get paid for your playlists\.\s*Share music with anyone\./);
    await expect(page.getByText('Any music you share opens in Spotify, Apple Music, or Deezer.', { exact: false })).toBeInViewport();
    await expect(page.getByRole('figure', { name: /Paste a Spotify link/ })).toBeInViewport();

    const start = page.getByRole('link', { name: 'Start your free page' });
    await expect(start.first()).toBeInViewport();
    for (const link of await start.all()) {
      await expect(link).toHaveAttribute('href', '/auth/signup?redirect=%2Fstudio');
    }

    await page.getByRole('link', { name: 'See how it works' }).click();
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeInViewport();

    // The curator page is a template: no example curator or music.
    await expect(page.getByText('Your page', { exact: true })).toBeVisible();
    await expect(page.getByText(/Nadia/)).toHaveCount(0);

    // Curator Pro shows only as later tools, never as the way to earn.
    await expect(page.getByText(/Curator Pro/)).toHaveText(['Coming later: Curator Pro, optional extra tools for curators.']);
  });

  test('turns the link card only while motion is allowed', async ({ page }) => {
    await mockCassetteApp(page);
    // After the shared mocks, which turn reduced motion on.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const card = page.getByRole('figure', { name: /Paste a Spotify link/ });
    const turning = card.getByTestId('link-card-turning');
    const still = card.getByTestId('link-card-still');

    // The converted link turns from Apple Music to Deezer.
    await expect(still).toBeHidden();
    await expect(turning.getByText('deezer.com/…')).toBeVisible({ timeout: 6000 });

    // Reduced motion switched on mid-session swaps in the still Apple Music link.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(turning).toBeHidden();
    await expect(still).toHaveText('music.apple.com/…');
    await expect(still).toBeVisible();
    await page.waitForTimeout(3000);
    expect(await turning.isVisible()).toBe(false);
    expect(await still.isVisible()).toBe(true);

    // Switched off again, the link turns through both services again.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(still).toBeHidden();
    await expect(turning.getByText('music.apple.com/…')).toBeVisible({ timeout: 6000 });
    await expect(turning.getByText('deezer.com/…')).toBeVisible({ timeout: 6000 });
  });

  test('waits for the session before it converts a linked music URL', async ({ page }) => {
    await mockCassetteApp(page);
    // Registered after the shared mocks, so it runs first and holds the session answer.
    let releaseSession = () => {};
    const sessionHeld = new Promise<void>((resolve) => { releaseSession = resolve; });
    await page.route('**/api/auth/session', async (route) => {
      await sessionHeld;
      await route.fallback();
    });
    let conversions = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/convert') conversions += 1;
    });

    const sessionRequested = page.waitForRequest('**/api/auth/session');
    await page.goto(`/?url=${encodeURIComponent(fixtureConvertTemplates.homeTrack.originalUrl)}`);
    await sessionRequested;
    await expect(page.getByTestId('home-search-input')).toBeVisible();
    // A conversion that ignored the pending session would start on mount; give it time to show.
    await page.waitForTimeout(500);
    expect(conversions).toBe(0);

    releaseSession();
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
    expect(conversions).toBe(1);
  });

  test('runs a later linked music URL after a failed conversion', async ({ page }) => {
    await mockCassetteApp(page);
    // No conversion template exists for this link, so it fails.
    await page.goto(`/?url=${encodeURIComponent('https://open.spotify.com/track/no-template')}`);
    await expect(page.getByRole('button', { name: 'Show me how.' })).toBeVisible();

    // Next.js follows the native History API, so this is a client-side visit.
    await page.evaluate((url) => window.history.pushState(null, '', `/?url=${encodeURIComponent(url)}`), fixtureConvertTemplates.homeTrack.originalUrl);
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
  });
});
