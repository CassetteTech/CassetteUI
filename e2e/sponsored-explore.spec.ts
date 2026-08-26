import { expect, test } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';

const organicPost = {
  postId: 'p_20260824000000_00000000000001',
  redirectPostId: 'p_20260824000000_00000000000001',
  elementType: 'Track',
  title: 'Organic track',
  subtitle: 'Organic artist',
  imageUrl: 'https://example.com/organic.jpg',
  username: 'organic-listener',
  userId: '11111111-1111-1111-1111-111111111111',
  createdAt: '2026-08-24T10:00:00Z',
};

const sponsoredPost = {
  postId: 'p_20260824000000_00000000000002',
  redirectPostId: 'p_20260824000000_00000000000002',
  elementType: 'Album',
  title: 'Signal Fire',
  subtitle: 'Mia Groove',
  imageUrl: 'https://example.com/sponsored.jpg',
  username: 'mia-groove',
  userId: '22222222-2222-2222-2222-222222222222',
  createdAt: '2026-08-24T11:00:00Z',
};

test('shows disclosed sponsored discovery outside organic results and measures it once', async ({ page }) => {
  const analyticsCaptures: Array<Record<string, unknown>> = [];
  await mockCassetteApp(page, {
    analyticsCaptures,
    exploreResponse: {
      items: [organicPost],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      isOwnProfile: false,
      sponsoredPlacement: {
        placementType: 'sponsored_explore',
        label: 'Sponsored',
        post: sponsoredPost,
      },
    },
  });

  await page.goto('/explore');

  const sponsored = page.getByTestId('sponsored-explore');
  await expect(sponsored).toBeVisible();
  await expect(sponsored.getByText('Sponsored', { exact: true })).toBeVisible();
  await expect(sponsored).toContainText('Paid advertising');
  await expect(sponsored).toContainText("separate from Cassette's organic rankings");
  await expect(sponsored).toContainText('Signal Fire');
  await expect(page.getByText('Organic track', { exact: true })).toBeVisible();
  await expect(page.getByText('Promoted', { exact: true })).toHaveCount(0);

  await sponsored.scrollIntoViewIfNeeded();
  await expect.poll(() => analyticsCaptures.filter((capture) =>
    capture.event === 'sponsored_explore_impression'
  ).length).toBe(1);
  const impression = analyticsCaptures.find((capture) =>
    capture.event === 'sponsored_explore_impression'
  );
  expect(impression?.properties).toMatchObject({
    placement_type: 'sponsored_explore',
    post_id: sponsoredPost.postId,
    source_surface: 'explore',
  });

  await sponsored.getByRole('link', { name: /Signal Fire/i }).click({ noWaitAfter: true });
  await expect.poll(() => analyticsCaptures.some((capture) =>
    capture.event === 'sponsored_explore_opened'
  )).toBe(true);
});

test('renders no sponsored section when inventory has no fill', async ({ page }) => {
  await mockCassetteApp(page, {
    exploreResponse: {
      items: [organicPost],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      isOwnProfile: false,
      sponsoredPlacement: null,
    },
  });

  await page.goto('/explore');

  await expect(page.getByTestId('sponsored-explore')).toHaveCount(0);
  await expect(page.getByText('Organic track', { exact: true })).toBeVisible();
});
