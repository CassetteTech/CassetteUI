/** Verifies Curator Studio opens on Music, sections have their own URLs, the Music section starts
    empty with Add music, and Add music lives in Studio while its old URL and global entry points
    still work. */

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
  const account = sidebar.locator('a[href="/studio"]');
  const feed = sidebar.getByRole('link', { name: 'Feed' });
  const memberships = sidebar.getByRole('link', { name: 'Memberships' });

  await expect(addMusic).toHaveAttribute('href', '/studio/music/new');
  // The account row is Studio's one entry; there is no Curator Studio page row.
  await expect(sidebar.getByRole('link', { name: 'Curator Studio' })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Add Music', exact: true })).toHaveCount(0);
  // An action, not a place: on its own page, the account row keeps the active state.
  await expect(addMusic).not.toHaveAttribute('data-active', 'true');
  await expect(account).toHaveAttribute('data-active', 'true');

  // The button has a page row's box and sits above the rows; the avatar and the footer icons
  // share the rows' icon edge.
  const [action, row, avatar, feedIcon, signOutIcon] = await Promise.all([
    addMusic.boundingBox(),
    feed.boundingBox(),
    account.locator('[data-slot="avatar"]').boundingBox(),
    feed.locator('svg').first().boundingBox(),
    sidebar.locator('[data-slot="sidebar-footer"]').getByRole('button', { name: 'Sign Out' }).locator('svg').boundingBox(),
  ]);
  expect(action!.x).toBe(row!.x);
  expect(action!.width).toBe(row!.width);
  expect(action!.height).toBe(row!.height);
  expect(action!.y).toBeLessThan(row!.y);
  expect(Math.abs(avatar!.x - feedIcon!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(signOutIcon!.x - feedIcon!.x)).toBeLessThanOrEqual(1);

  // Add music leads the page rows: 20 px under the account row, 12 px above the first row. The
  // footer rows share the page rows' pitch.
  const footer = sidebar.locator('[data-slot="sidebar-footer"]');
  const [accountBox, secondRow, report, signOut, inbox] = await Promise.all([
    account.boundingBox(),
    memberships.boundingBox(),
    footer.getByRole('button', { name: 'Report a Problem' }).boundingBox(),
    footer.getByRole('button', { name: 'Sign Out' }).boundingBox(),
    sidebar.locator('[data-slot="sidebar-header"]').getByRole('button', { name: 'Notifications' }).boundingBox(),
  ]);
  expect(action!.y - (accountBox!.y + accountBox!.height)).toBe(20);
  expect(row!.y - (action!.y + action!.height)).toBe(12);
  expect(signOut!.y - report!.y).toBe(secondRow!.y - row!.y);
  // The header inbox ends on the rows' right edge.
  expect(inbox!.x + inbox!.width).toBe(row!.x + row!.width);
});

test('one sidebar highlight follows the pointer over the page rows and returns to the active row', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/memberships');
  const menu = page.locator('[data-sidebar="menu"]');
  const highlight = page.locator('[data-sidebar="menu-highlight"]');
  const feed = menu.getByRole('link', { name: 'Feed' });
  const memberships = menu.getByRole('link', { name: 'Memberships' });
  const highlightTop = async () => (await highlight.boundingBox())?.y;

  // mockCassetteApp emulates reduced motion, so the highlight moves without a transition.
  await expect(highlight).toHaveCSS('opacity', '1');
  await expect.poll(highlightTop).toBe((await memberships.boundingBox())!.y);

  await feed.hover();
  await expect.poll(highlightTop).toBe((await feed.boundingBox())!.y);
  // The rows paint no fill of their own; the highlight is the only one.
  await expect(memberships).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(feed).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await page.mouse.move(800, 400);
  await expect.poll(highlightTop).toBe((await memberships.boundingBox())!.y);

  // Studio's entry is the account row, so on Studio and on the own public page no page row is
  // active and the highlight shows only under the pointer.
  for (const path of ['/studio', `/profile/${fixtureUsers.member.username}`]) {
    await page.goto(path);
    await expect(highlight).toHaveCSS('opacity', '0');
    await memberships.hover();
    await expect(highlight).toHaveCSS('opacity', '1');
    await expect.poll(highlightTop).toBe((await memberships.boundingBox())!.y);
    await page.mouse.move(800, 400);
    await expect(highlight).toHaveCSS('opacity', '0');
  }
});
