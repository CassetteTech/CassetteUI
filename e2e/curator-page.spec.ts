/** Covers public curator visibility, locked-content privacy, entitlement, and responsive layout. */

import { expect, type Page, test } from '@playwright/test';

import {
  CURATOR_SUBSCRIBER_SENTINEL,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureMemberCuratorPage,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const MOBILE_VIEWPORT = { width: 390, height: 667 };

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  ) - window.innerWidth)).toBeLessThanOrEqual(1);
}

test('shows a paid curator plan without leaking locked content to a nonmember', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
  });

  await page.goto(CURATOR_PATH);

  await expect(
    page.getByText(fixtureUsers.playlistCurator.displayName, { exact: true }).first(),
  ).toBeVisible();
  const membershipCard = page.locator('[data-testid="curator-membership-card"]:visible').first();
  await expect(membershipCard).toContainText(
    fixtureCuratorPage.membership!.name,
  );
  await expect(membershipCard).toContainText(
    fixtureCuratorPage.membership!.benefits[0].name,
  );
  await expect(membershipCard).toContainText(/\$5\.50\s*\/month/);
  await expect(membershipCard.getByRole('button', { name: /join/i })).toBeVisible();
  const lockedPost = page.locator('[data-testid="curator-locked-post"]:visible').first();
  await expect(lockedPost).toBeVisible();
  const lockedJoin = lockedPost.getByRole('link', { name: /join/i });
  await expect(lockedJoin).toHaveAttribute('href', /^#membership-/);
  const membershipTarget = await lockedJoin.getAttribute('href');
  if (!membershipTarget) throw new Error('Join link is missing its membership target');
  const target = page.locator(`[id="${membershipTarget.slice(1)}"]`);
  await expect(target).toHaveCount(1);
  await expect(target).toBeVisible();
  await expect(lockedPost.locator('a[href^="/post/"]')).toHaveCount(0);
  expect(await page.content()).not.toContain(CURATOR_SUBSCRIBER_SENTINEL);
  expect(await page.content()).not.toContain('subscriber-secret-artwork');
});

test('shows subscriber content and the member badge to an entitled viewer', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
  });

  await page.goto(CURATOR_PATH);

  await expect(
    page.locator('h3:visible').filter({ hasText: CURATOR_SUBSCRIBER_SENTINEL }).first(),
  ).toBeVisible();
  await expect(
    page.getByTestId('curator-membership-card').getByText('Member', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /join/i })).toHaveCount(0);
});

test('keeps an active curator without Pro public-only', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureFreeCuratorPage,
  });

  await page.goto(CURATOR_PATH);

  await expect(
    page.locator('h3:visible').filter({ hasText: 'Sunday Morning Selects' }).first(),
  ).toBeVisible();
  await expect(page.getByTestId('curator-membership-card')).toHaveCount(0);
  await expect(page.getByTestId('curator-locked-post')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /join/i })).toHaveCount(0);
  expect(await page.content()).not.toContain(CURATOR_SUBSCRIBER_SENTINEL);
});

test('loads each curator feed page once without repeating earlier posts', async ({ page }) => {
  const firstPost = fixtureFreeCuratorPage.posts.items[0];
  if (firstPost.kind !== 'post') throw new Error('Expected a public curator post fixture');
  const items = Array.from({ length: 21 }, (_, index) => ({
    ...firstPost,
    post: {
      ...firstPost.post,
      postId: `post-curator-page-${index + 1}`,
      redirectPostId: `post-curator-page-${index + 1}`,
      title: `Curator page item ${index + 1}`,
    },
  }));

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: {
      ...fixtureFreeCuratorPage,
      posts: {
        items,
        totalItems: items.length,
        page: 1,
        pageSize: 20,
      },
    },
  });

  await page.goto(CURATOR_PATH);

  await expect(page.getByRole('heading', { name: 'Curator page item 20' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Curator page item 21' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.getByRole('heading', { name: 'Curator page item 21' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
});

test('keeps the ordinary profile visible when curator monetization is unavailable', async ({ page }) => {
  const suspendedCurator = {
    ...fixtureUsers.playlistCurator,
    id: 'user-suspended-curator',
    username: 'suspended-curator',
    displayName: 'Suspended Curator',
  };
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    users: [suspendedCurator],
  });

  await page.goto(`/profile/${suspendedCurator.username}`);
  await expect(page.getByText(suspendedCurator.displayName, { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('curator-membership-card')).toHaveCount(0);

  await page.goto('/profile/missing-curator');
  await expect(page.getByRole('heading', { name: /user not found/i })).toBeVisible();
});

test('redirects legacy curator links to the canonical profile with query state intact', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
  });

  await page.goto(`/curator/${fixtureCuratorPage.curator.username}?membership=canceled&source=legacy`);

  await expect(page.getByTestId('membership-notice')).toHaveText(
    'Checkout was canceled. You were not charged.',
  );
  await expect(page).toHaveURL(
    new RegExp(`/profile/${fixtureCuratorPage.curator.username}\\?source=legacy$`),
  );
});

test('keeps the curator page accessible and responsive on mobile and desktop', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
  });

  await page.goto(CURATOR_PATH);

  await expect(
    page.locator('[data-testid="curator-details"]:visible').first(),
  ).toBeInViewport({ ratio: 1 });
  const joinButton = page.locator('[data-testid="curator-membership-card"]:visible').first()
    .getByRole('button', { name: /join/i });
  await joinButton.scrollIntoViewIfNeeded();
  await expect(joinButton).toBeInViewport({ ratio: 1 });
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 900, height: 800 });
  await expect(page.locator('[data-slot="sidebar-gap"]')).toBeHidden();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1440, height: 900 });

  const feedBounds = await page.locator('[data-testid="curator-feed"]:visible').first().boundingBox();
  const membershipBounds = await page.locator('[data-testid="curator-membership-card"]:visible').first().boundingBox();
  expect(feedBounds).not.toBeNull();
  expect(membershipBounds).not.toBeNull();
  expect(membershipBounds!.x).toBeGreaterThan(feedBounds!.x);
});
