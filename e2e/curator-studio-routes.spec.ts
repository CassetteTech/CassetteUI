/** Verifies Curator Studio sections have their own URLs, the Music section starts empty with
    Add music, and Add music lives in Studio while its old URL and global entry points still work. */

import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('opens each section at its own URL and keeps a plan draft across sections', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/membership');
  const planName = page.getByTestId('curator-plan-card').getByLabel('Plan name');
  await planName.fill('Early Club');

  await page.getByTestId('studio-overview-trigger').click();
  await expect(page).toHaveURL('/studio');
  await expect(page.getByTestId('studio-overview-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(planName).toBeHidden();

  await page.getByTestId('studio-billing-trigger').click();
  await expect(page).toHaveURL('/studio/payouts');
  await expect(page.getByTestId('curator-payout-card')).toBeVisible();

  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL('/studio/membership');
  await expect(planName).toHaveValue('Early Club');
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
  // An action, not a place: on its own page, Studio keeps the active row.
  await expect(addMusic).not.toHaveAttribute('data-active', 'true');
  await expect(studio).toHaveAttribute('data-active', 'true');

  // The button has a page row's box and sits above the rows; the avatar and the footer icons
  // share the rows' icon edge.
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
});
