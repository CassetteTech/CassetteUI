import { expect, type Page, test } from '@playwright/test';

import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const discoverResponse = {
  items: [{
    postId: 'p_20261001120000_00000000000009',
    redirectPostId: 'p_20261001120000_00000000000009',
    elementType: 'Track',
    title: 'Organic track',
    subtitle: 'Organic artist',
    imageUrl: 'https://example.com/organic.jpg',
    username: 'organic-listener',
    userId: '33333333-3333-3333-3333-333333333339',
    createdAt: '2026-10-01T12:00:00Z',
    privacy: 'public',
  }],
  page: 1,
  pageSize: 20,
  totalItems: 1,
  isOwnProfile: false,
  sponsoredPlacement: null,
};

const featuredCurators = ['first', 'second', 'third'].map((name, index) => ({
  userId: `44444444-4444-4444-4444-44444444444${index}`,
  username: `${name}-curator`,
  displayName: `${name} curator`,
  publicPostCount: 3,
  recentArtworkUrls: [],
  hasActiveMembershipPlan: true,
}));

function trackFeedRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/social/feed/posts') urls.push(request.url());
  });
  return urls;
}

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

for (const viewer of [{ name: 'a member', currentUser: fixtureUsers.member }, { name: 'a signed-out visitor', currentUser: undefined }]) {
  test(`Explore shows discovery to ${viewer.name} without tabs or a Feed read`, async ({ page }) => {
    const feedRequests = trackFeedRequests(page);
    await mockCassetteApp(page, { currentUser: viewer.currentUser, exploreResponse: discoverResponse });

    await page.goto('/explore');

    await expect(page.getByText('Organic track', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Creators' })).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(feedRequests).toEqual([]);
  });
}

test('an old tab link opens plain Explore, keeps other parameters, and leaves the stored tab alone', async ({ page }) => {
  const feedRequests = trackFeedRequests(page);
  await page.addInitScript(() => localStorage.setItem('cassette:explore-tab', 'subscriptions'));
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, exploreResponse: discoverResponse });

  await page.goto('/explore?tab=subscriptions&filter=members&utm_source=newsletter');

  await expect(page).toHaveURL('/explore?utm_source=newsletter');
  await expect(page.getByText('Organic track', { exact: true })).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('cassette:explore-tab'))).toBe('subscriptions');
  expect(feedRequests).toEqual([]);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`Explore centers the featured curators (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      exploreResponse: discoverResponse,
      exploreCurators: featuredCurators,
    });

    await page.goto('/explore');

    await expectCenteredCoverflow(page);
  });
}
