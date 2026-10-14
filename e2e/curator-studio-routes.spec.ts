import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('opens each section at its own URL and keeps a plan draft across sections', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/membership');
  const planName = page.getByTestId('curator-plan-card').getByLabel('Plan name');
  await planName.fill('Early Club');

  await page.getByTestId('studio-music-trigger').click();
  await expect(page).toHaveURL('/studio/music');
  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(planName).toBeHidden();

  await page.getByTestId('studio-billing-trigger').click();
  await expect(page).toHaveURL('/studio/payouts');
  await expect(page.getByTestId('curator-payout-card')).toBeVisible();

  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL('/studio/membership');
  await expect(planName).toHaveValue('Early Club');
});

test('opens Studio on Music with three section links, and keeps the query', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio?type=playlists');

  await expect(page).toHaveURL('/studio/music?type=playlists');
  const sections = page.getByRole('navigation', { name: 'Studio sections' });
  await expect(sections.getByRole('link')).toHaveText(['Music', 'Membership', 'Payouts & billing']);
  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
});

test('offers the first music from an empty Music section', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/music');

  await expect(page.getByRole('link', { name: 'Add your first music' }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmusic');
});

test('the Studio header opens Add music with a return to the open section', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/membership');

  const studioHeader = page.locator('header').filter({ hasText: 'Curator Studio' });
  await expect(studioHeader.getByRole('link', { name: 'Add music', exact: true }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmembership');
});

test('returns a post made from Studio to the section that opened Add music', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/music/new?from=%2Fstudio%2Fmusic');
  await page.locator('[data-testid="add-music-input"]:visible').fill('blue monday');
  await page.locator('[data-testid="search-result-track-search-track-1"]:visible').click();
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL('/post/post-created-track?from=%2Fstudio%2Fmusic');
});

test('keeps the Add music query through sign-in', async ({ page }) => {
  await mockCassetteApp(page);

  await page.goto('/studio/music/new?from=%2Fstudio%2Fmusic');

  await expect(page).toHaveURL(
    `/auth/signin?redirect=${encodeURIComponent('/studio/music/new?from=%2Fstudio%2Fmusic')}`,
  );
});

test('redirects the old Add Music URL and keeps its query', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });
  const link = 'https://open.spotify.com/track/add-music-track-1';

  await page.goto(`/add-music?url=${encodeURIComponent(link)}`);

  await expect(page).toHaveURL(`/studio/music/new?url=${encodeURIComponent(link)}`);
  await expect(page.getByRole('heading', { name: 'Add music' }).first()).toBeVisible();
});

test('the sidebar offers Add music as a button above the page links, in their box', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/music/new');
  const sidebar = page.locator('[data-slot="sidebar"]');
  const addMusic = sidebar.getByRole('link', { name: 'Add music', exact: true });
  const studio = sidebar.getByRole('link', { name: 'Curator Studio' });
  const feed = sidebar.getByRole('link', { name: 'Feed' });

  await expect(addMusic).toHaveAttribute('href', '/studio/music/new');
  await expect(studio).toHaveAttribute('href', '/studio');
  await expect(sidebar.getByRole('link', { name: 'Add Music', exact: true })).toHaveCount(0);
  await expect(addMusic).not.toHaveAttribute('data-active', 'true');
  await expect(studio).toHaveAttribute('data-active', 'true');

  const [action, row, avatar, feedIcon, signOutIcon] = await Promise.all([
    addMusic.boundingBox(),
    feed.boundingBox(),
    sidebar.locator('a[href="/profile/miagroove"] [data-slot="avatar"]').boundingBox(),
    feed.locator('svg').first().boundingBox(),
    sidebar.locator('[data-slot="sidebar-footer"]').getByRole('button', { name: 'Sign Out' }).locator('svg').boundingBox(),
  ]);
  expect(action!.x).toBe(row!.x);
  expect(action!.width).toBe(row!.width);
  expect(action!.height).toBe(row!.height);
  expect(action!.y).toBeLessThan(row!.y);
  expect(Math.abs(avatar!.x - feedIcon!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(signOutIcon!.x - feedIcon!.x)).toBeLessThanOrEqual(1);

  const footer = sidebar.locator('[data-slot="sidebar-footer"]');
  const [account, firstRow, report, signOut, inbox] = await Promise.all([
    sidebar.locator('a[href="/profile/miagroove"]').boundingBox(),
    studio.boundingBox(),
    footer.getByRole('button', { name: 'Report a Problem' }).boundingBox(),
    footer.getByRole('button', { name: 'Sign Out' }).boundingBox(),
    sidebar.locator('[data-slot="sidebar-header"]').getByRole('button', { name: 'Notifications' }).boundingBox(),
  ]);
  expect(action!.y - (account!.y + account!.height)).toBe(20);
  expect(firstRow!.y - (action!.y + action!.height)).toBe(12);
  expect(signOut!.y - report!.y).toBe(row!.y - firstRow!.y);
  expect(inbox!.x + inbox!.width).toBe(row!.x + row!.width);
});

test('one sidebar highlight follows the pointer over the page rows and returns to the active row', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio');
  const menu = page.locator('[data-sidebar="menu"]');
  const highlight = page.locator('[data-sidebar="menu-highlight"]');
  const studio = menu.getByRole('link', { name: 'Curator Studio' });
  const memberships = menu.getByRole('link', { name: 'Memberships' });
  const highlightTop = async () => (await highlight.boundingBox())?.y;

  // mockCassetteApp emulates reduced motion, so the highlight moves without a transition.
  await expect(highlight).toHaveCSS('opacity', '1');
  await expect.poll(highlightTop).toBe((await studio.boundingBox())!.y);

  await memberships.hover();
  await expect.poll(highlightTop).toBe((await memberships.boundingBox())!.y);
  await expect(memberships).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(studio).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await page.mouse.move(800, 400);
  await expect.poll(highlightTop).toBe((await studio.boundingBox())!.y);

  await page.goto(`/profile/${fixtureUsers.member.username}`);
  await expect(highlight).toHaveCSS('opacity', '0');
  await memberships.hover();
  await expect(highlight).toHaveCSS('opacity', '1');
  await expect.poll(highlightTop).toBe((await memberships.boundingBox())!.y);
});
