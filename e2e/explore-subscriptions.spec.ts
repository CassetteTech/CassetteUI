/** Verifies the Explore Discover and Subscriptions tabs: default tab, explicit choice, filter, paging, and states. */

import { expect, type Page, test } from '@playwright/test';

import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const feedPost = (index: number, privacy: 'public' | 'subscriber', username: string) => ({
  postId: `p_20261001120000_0000000000000${index}`,
  redirectPostId: `p_20261001120000_0000000000000${index}`,
  elementType: 'Track',
  title: `Feed track ${index}`,
  subtitle: `Feed artist ${index}`,
  imageUrl: `https://example.com/feed-${index}.jpg`,
  username,
  userId: '33333333-3333-3333-3333-33333333333' + index,
  createdAt: '2026-10-01T12:00:00Z',
  privacy,
});

const memberPage = (items: unknown[], nextCursor: string | null) => ({
  items,
  nextCursor,
  subscribedCuratorCount: 2,
  hasMembershipHistory: true,
});

const memberFeed = ({ cursor, membersOnly }: { cursor: string | null; membersOnly: boolean }) => {
  if (membersOnly) {
    return { body: memberPage([feedPost(1, 'subscriber', 'night-curator')], null) };
  }
  return cursor === null
    ? { body: memberPage([feedPost(1, 'subscriber', 'night-curator'), feedPost(2, 'public', 'day-curator')], 'cursor-page-2') }
    : { body: memberPage([feedPost(3, 'public', 'night-curator')], null) };
};

const discoverResponse = {
  items: [{ ...feedPost(9, 'public', 'organic-listener'), title: 'Organic track' }],
  page: 1,
  pageSize: 20,
  totalItems: 1,
  isOwnProfile: false,
  sponsoredPlacement: null,
};

const tab = (page: Page, name: 'Discover' | 'Subscriptions') => page.getByRole('tab', { name });

const featuredCurators = ['first', 'second', 'third'].map((name, index) => ({
  userId: `44444444-4444-4444-4444-44444444444${index}`,
  username: `${name}-curator`,
  displayName: `${name} curator`,
  publicPostCount: 3,
  recentArtworkUrls: [],
}));

// Discover starts hidden behind a member's Subscriptions tab, so the curator
// rail must still center its first card and fan the neighbors once shown.
const expectCenteredCoverflow = async (page: Page) => {
  const centered = page.getByRole('link', { name: 'View first curator on Cassette' });
  await expect(centered).toBeVisible();
  await expect.poll(async () => centered.evaluate((card) => {
    const track = card.parentElement!.parentElement!.parentElement!;
    const cardBox = card.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();
    return Math.round(Math.abs(cardBox.left + cardBox.width / 2 - (trackBox.left + trackBox.width / 2)));
  })).toBeLessThanOrEqual(2);
  const neighbor = page.getByRole('link', { name: 'View second curator on Cassette' });
  await expect(neighbor.locator('..')).toHaveCSS('transform', /matrix3d/);
};


test('a member lands on Subscriptions and pages through newest posts', async ({ page }) => {
  const subscriptionFeedRequests: string[] = [];
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    exploreResponse: discoverResponse,
    subscriptionFeed: memberFeed,
    subscriptionFeedRequests,
  });

  await page.goto('/explore');

  await expect(tab(page, 'Subscriptions')).toHaveAttribute('aria-selected', 'true');
  const feed = page.getByRole('tabpanel', { name: 'Subscriptions' });
  await expect(feed.getByRole('heading', { name: 'From your curators' })).toBeVisible();
  await expect(feed.getByRole('link', { name: /Feed track/ })).toHaveText([/Feed track 1/, /Feed track 2/]);
  await expect(feed.getByRole('link', { name: /Feed track 1/ })).toContainText('Members only');
  await expect(feed.getByRole('link', { name: /Feed track 2/ })).not.toContainText('Members only');

  await feed.getByRole('button', { name: 'Load more' }).click();
  await expect(feed.getByRole('link', { name: /Feed track/ })).toHaveText([/Feed track 1/, /Feed track 2/, /Feed track 3/]);
  await expect(feed.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  expect(subscriptionFeedRequests.map((url) => new URL(url).searchParams.get('cursor'))).toEqual([null, 'cursor-page-2']);

  // Discover keeps the existing experience.
  await tab(page, 'Discover').click();
  await expect(page).toHaveURL(/tab=discover/);
  await expect(page.getByText('Organic track', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Creators' })).toBeVisible();
});

test('Explore waits for the membership answer before it picks the first tab', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, subscriptionFeed: memberFeed });
  let release!: () => void;
  const answered = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/social/subscriptions/posts**', async (route) => {
    await answered;
    await route.fallback();
  });

  await page.goto('/explore');
  await expect(page.getByLabel('Loading Explore')).toBeVisible();
  await expect(page.getByRole('tablist')).toBeHidden();

  release();
  await expect(tab(page, 'Subscriptions')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Loading Explore')).toHaveCount(0);
});

test('the Members only filter asks the server for member posts', async ({ page }) => {
  const subscriptionFeedRequests: string[] = [];
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    subscriptionFeed: memberFeed,
    subscriptionFeedRequests,
  });

  await page.goto('/explore');
  const filter = page.getByRole('button', { name: 'Members only' });
  await filter.click();

  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/tab=subscriptions&filter=members/);
  await expect(page.getByRole('heading', { name: 'Member posts' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Feed track/ })).toHaveText([/Feed track 1/]);
  expect(new URL(subscriptionFeedRequests.at(-1)!).searchParams.get('membersOnly')).toBe('true');
});

test('an explicit tab choice survives a later visit and keyboard selection works', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    exploreResponse: discoverResponse,
    subscriptionFeed: memberFeed,
  });

  await page.goto('/explore');
  await expect(tab(page, 'Subscriptions')).toHaveAttribute('aria-selected', 'true');
  await tab(page, 'Subscriptions').focus();
  // Fast presses must each act on the tab the one before selected.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await expect(tab(page, 'Discover')).toBeFocused();
  await expect(tab(page, 'Discover')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/tab=discover/);

  await page.goto('/explore');
  await expect(tab(page, 'Discover')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Organic track', { exact: true })).toBeVisible();
});

test('signed-out viewers start on Discover and are asked to sign in for Subscriptions', async ({ page }) => {
  const subscriptionFeedRequests: string[] = [];
  await mockCassetteApp(page, { exploreResponse: discoverResponse, subscriptionFeedRequests });

  await page.goto('/explore');
  await expect(tab(page, 'Discover')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Organic track', { exact: true })).toBeVisible();

  await tab(page, 'Subscriptions').click();
  await expect(page.getByText('Sign in to see your subscriptions')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
    'href',
    `/auth/signin?redirect=${encodeURIComponent('/explore?tab=subscriptions')}`,
  );
  expect(subscriptionFeedRequests).toEqual([]);
});

test('a viewer without memberships starts on Discover and can return to it', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.viewer, exploreResponse: discoverResponse });

  await page.goto('/explore');
  await expect(tab(page, 'Discover')).toHaveAttribute('aria-selected', 'true');

  await tab(page, 'Subscriptions').click();
  await expect(page.getByText('No memberships yet')).toBeVisible();
  await page.getByRole('button', { name: 'Discover curators' }).click();
  await expect(tab(page, 'Discover')).toHaveAttribute('aria-selected', 'true');
});

test('ended memberships point to My memberships', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    subscriptionFeed: () => ({
      body: { items: [], nextCursor: null, subscribedCuratorCount: 0, hasMembershipHistory: true },
    }),
  });

  await page.goto('/explore?tab=subscriptions');

  await expect(page.getByText('Your memberships have ended')).toBeVisible();
  await expect(page.getByRole('link', { name: 'My memberships' })).toHaveAttribute('href', '/memberships');
});

test('a failed feed read offers a retry', async ({ page }) => {
  let available = false;
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    subscriptionFeed: (query) => (available ? memberFeed(query) : { status: 503, body: 'unavailable' }),
  });

  await page.goto('/explore?tab=subscriptions');
  // The app retries a failed read twice with backoff before it shows the error.
  await expect(page.getByText('Your subscriptions could not load')).toBeVisible({ timeout: 15_000 });
  available = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: /Feed track 1/ })).toBeVisible();
});

test('a feed response without its metadata is an error, not an empty feed', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    subscriptionFeed: () => ({ body: { items: [feedPost(1, 'subscriber', 'night-curator')] } }),
  });

  await page.goto('/explore?tab=subscriptions');

  await expect(page.getByText('Your subscriptions could not load')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('No memberships yet')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Feed track 1/ })).toHaveCount(0);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`Discover centers the featured curators after a member switches from Subscriptions (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      exploreResponse: discoverResponse,
      subscriptionFeed: memberFeed,
    });
    await page.route('**/api/v1/social/explore/curators', (route) =>
      route.fulfill({ json: { curators: featuredCurators } }));

    await page.goto('/explore');
    await expect(tab(page, 'Subscriptions')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('link', { name: /Feed track 1/ })).toBeVisible();
    await tab(page, 'Discover').click();
    await expectCenteredCoverflow(page);

    await tab(page, 'Subscriptions').click();
    await tab(page, 'Discover').click();
    await expectCenteredCoverflow(page);
  });

  test(`Discover shown from the start centers the featured curators (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, exploreResponse: discoverResponse });
    await page.route('**/api/v1/social/explore/curators', (route) =>
      route.fulfill({ json: { curators: featuredCurators } }));

    await page.goto('/explore?tab=discover');

    await expectCenteredCoverflow(page);
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the subscription feed fits the screen', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, subscriptionFeed: memberFeed });

    await page.goto('/explore');
    await expect(page.getByRole('link', { name: /Feed track 1/ })).toBeVisible();
    await expect(tab(page, 'Subscriptions')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Members only' })).toBeInViewport();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
