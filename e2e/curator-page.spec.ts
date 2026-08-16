import { expect, type Page, test } from '@playwright/test';

import {
  CURATOR_SUBSCRIBER_SENTINEL,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureMemberCuratorPage,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const CURATOR_PATH = `/curator/${fixtureCuratorPage.curator.username}`;
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

  const main = page.locator('main:visible').last();
  await expect(main.getByRole('heading', {
    level: 1,
    name: fixtureUsers.playlistCurator.displayName,
  })).toBeVisible();
  const membershipCard = page.locator('[data-testid="curator-membership-card"]:visible').first();
  await expect(membershipCard).toContainText(
    fixtureCuratorPage.membership!.name,
  );
  await expect(membershipCard).toContainText(
    fixtureCuratorPage.membership!.benefits[0].name,
  );
  await expect(membershipCard).toContainText(/\$5\.50\s*\/month/);
  const membershipJoin = membershipCard.getByRole('link', { name: /join/i });
  await expect(membershipJoin).toHaveAttribute('href', /^#membership-/);
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
    page.locator('[data-testid="curator-profile"]:visible').first()
      .getByText('Member', { exact: true }),
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

test('renders the same not-found state for suspended and missing curators', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.viewer });

  for (const username of ['suspended-curator', 'missing-curator']) {
    await page.goto(`/curator/${username}`);
    await expect(page.getByRole('heading', { name: /curator not found/i })).toBeVisible();
    await expect(page.getByTestId('curator-profile')).toHaveCount(0);
  }
});

test('keeps the curator page accessible and responsive on mobile and desktop', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
  });

  await page.goto(CURATOR_PATH);

  await expect(page.locator('h1:visible')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="curator-profile"]:visible').first(),
  ).toBeInViewport({ ratio: 1 });
  const joinLink = page.locator('[data-testid="curator-membership-card"]:visible').first()
    .getByRole('link', { name: /join/i });
  await joinLink.scrollIntoViewIfNeeded();
  await expect(joinLink).toBeInViewport({ ratio: 1 });
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1440, height: 900 });

  const feedBounds = await page.locator('[data-testid="curator-feed"]:visible').first().boundingBox();
  const membershipBounds = await page.locator('[data-testid="curator-membership-card"]:visible').first().boundingBox();
  expect(feedBounds).not.toBeNull();
  expect(membershipBounds).not.toBeNull();
  expect(membershipBounds!.x).toBeGreaterThan(feedBounds!.x);
});
