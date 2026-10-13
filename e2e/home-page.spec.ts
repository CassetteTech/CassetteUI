import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates, fixtureUsers } from './support/cassette-fixtures';
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
    await expect(page.getByRole('figure', { name: /Paste a Spotify, Apple Music, or Deezer link/ })).toBeInViewport();

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

  test('links the signed-in pill to the public profile, with the account menu below 1024 px', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });
    await page.goto('/');

    const pill = page.getByTestId('navbar-profile-link');
    await expect(pill).toHaveAttribute('href', `/profile/${fixtureUsers.member.username}`);
    await expect(pill).toHaveAccessibleName(/^Mia Groove\s*@miagroove$/);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();

    // Below 1024 px the app pages have no sidebar, so the menu holds the account routes.
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(pill).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.locator('#mobile-menu-panel');
    await expect(menu.getByRole('link', { name: 'Curator Studio' })).toHaveAttribute('href', '/studio');
    await expect(menu.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    // The open menu covers the floating Ko-fi button instead of sitting under it: the panel, or
    // the backdrop under a short panel, is on top at the button's center.
    const kofi = await page.getByRole('button', { name: 'Support Cassette on Ko-fi' }).boundingBox();
    expect(kofi).not.toBeNull();
    expect(await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('#mobile-menu-panel, [data-testid="mobile-menu-backdrop"]') !== null,
      { x: kofi!.x + kofi!.width / 2, y: kofi!.y + kofi!.height / 2 },
    )).toBe(true);

    // Growing past 1024 px closes the menu and gives the page its scroll back.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(menu).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  });

  test('turns the link card only while motion is allowed', async ({ page }) => {
    await mockCassetteApp(page);
    // After the shared mocks, which turn reduced motion on.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const card = page.getByRole('figure', { name: /Paste a Spotify, Apple Music, or Deezer link/ });
    const pasted = card.getByTestId('link-card-pasted-turning');
    const converted = card.getByTestId('link-card-converted-turning');
    const pastedStill = card.getByTestId('link-card-pasted-still');
    const convertedStill = card.getByTestId('link-card-converted-still');

    // The pasted Spotify link converts to Apple Music, then Deezer; then the
    // pasted link turns to Apple Music.
    await expect(pastedStill).toBeHidden();
    await expect(convertedStill).toBeHidden();
    await expect(pasted.getByText('open.spotify.com/…')).toBeVisible();
    await expect(converted.getByText('deezer.com/…')).toBeVisible({ timeout: 4000 });
    await expect(pasted.getByText('music.apple.com/…')).toBeVisible({ timeout: 4000 });

    // Reduced motion switched on mid-session swaps in the still Spotify to Apple Music pair.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(pasted).toBeHidden();
    await expect(converted).toBeHidden();
    await expect(pastedStill).toHaveText('open.spotify.com/…');
    await expect(convertedStill).toHaveText('music.apple.com/…');
    await page.waitForTimeout(3000);
    expect(await pasted.isVisible()).toBe(false);
    expect(await convertedStill.isVisible()).toBe(true);

    // Switched off again, both rows turn again, through to a pasted Deezer link.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(pastedStill).toBeHidden();
    await expect(convertedStill).toBeHidden();
    await expect(pasted.getByText('deezer.com/…')).toBeVisible({ timeout: 10000 });
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
    // No conversion template exists for this link, so it fails on the conversion page.
    await page.goto(`/?url=${encodeURIComponent('https://open.spotify.com/track/no-template')}`);
    await expect(page.getByRole('heading', { name: 'Unable to load content' })).toBeVisible();

    // Next.js follows the native History API, so this is a client-side visit.
    await page.evaluate((url) => window.history.pushState(null, '', `/?url=${encodeURIComponent(url)}`), fixtureConvertTemplates.homeTrack.originalUrl);
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
  });
});
