/** Verifies Curator Studio sections have their own URLs, the Music section lists the owner's
    posts, and Add music lives in Studio while its old URL and global entry points still work. */

import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const ownPost = (postId: string, title: string, privacy: 'public' | 'subscriber' | 'private') => ({
  ...fixturePosts.publicTrack,
  postId,
  title,
  privacy,
  ownerId: fixtureUsers.member.id,
  ownerUsername: fixtureUsers.member.username,
});

test('opens each section at its own URL and keeps a plan draft across sections', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio');
  const planName = page.getByTestId('curator-plan-card').getByLabel('Plan name');
  await planName.fill('Early Club');

  await page.getByTestId('studio-earnings-trigger').click();
  await expect(page).toHaveURL('/studio/members');
  await expect(page.getByTestId('studio-earnings-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(planName).toBeHidden();

  await page.getByTestId('studio-billing-trigger').click();
  await expect(page).toHaveURL('/studio/payouts');
  await expect(page.getByTestId('curator-payout-card')).toBeVisible();

  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL('/studio');
  await expect(planName).toHaveValue('Early Club');
});

test('lists the owner music with who can open each post and filters by that setting', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [
      ownPost('studio-music-public', 'Open Track', 'public'),
      ownPost('studio-music-members', 'Members Track', 'subscriber'),
      ownPost('studio-music-private', 'Hidden Track', 'private'),
    ],
  });

  await page.goto('/studio/music');
  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
  const rows = page.getByTestId('studio-music-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: 'Members Track' })).toContainText('Members only');
  await expect(rows.filter({ hasText: 'Hidden Track' })).toContainText('Private');
  await expect(rows.filter({ hasText: 'Open Track' }))
    .toHaveAttribute('href', '/post/studio-music-public?from=%2Fstudio%2Fmusic');

  const filtered = page.waitForRequest((request) =>
    request.url().includes('/activity') && new URL(request.url()).searchParams.get('privacy') === 'subscriber');
  await page.getByRole('radio', { name: 'Members', exact: true }).click();
  await filtered;
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Members Track');
});

test('offers the first music from an empty Music section', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/music');

  await expect(page.getByRole('link', { name: 'Add your first music' }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmusic');
});

test('the Studio header opens Add music with a return to the open section', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/members');

  const studioHeader = page.locator('header').filter({ hasText: 'Curator Studio' });
  await expect(studioHeader.getByRole('link', { name: 'Add music', exact: true }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmembers');
});

test('returns a post made from Studio to the section that opened Add music', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio/music/new?from=%2Fstudio%2Fmusic');
  await page.locator('[data-testid="add-music-input"]:visible').fill('blue monday');
  await page.locator('[data-testid="search-result-track-search-track-1"]:visible').click();
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL('/post/post-created-track?from=%2Fstudio%2Fmusic');
});

test('redirects the old Add Music URL and keeps its query', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });
  const link = 'https://open.spotify.com/track/add-music-track-1';

  await page.goto(`/add-music?url=${encodeURIComponent(link)}`);

  await expect(page).toHaveURL(`/studio/music/new?url=${encodeURIComponent(link)}`);
  await expect(page.getByRole('heading', { name: 'Add music' }).first()).toBeVisible();
});

test('the sidebar offers Add music as a button above the page links', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/studio');
  const sidebar = page.locator('[data-slot="sidebar"]');

  await expect(sidebar.getByRole('link', { name: 'Add music', exact: true })).toHaveAttribute('href', '/studio/music/new');
  await expect(sidebar.getByRole('link', { name: 'Curator Studio' })).toHaveAttribute('href', '/studio');
  await expect(sidebar.getByRole('link', { name: 'Add Music', exact: true })).toHaveCount(0);
});
