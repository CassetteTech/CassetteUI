import { expect, type Locator, type Page, test } from '@playwright/test';

import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const MOBILE_VIEWPORT = { width: 390, height: 667 };

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
}

async function expectControlWithinViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
}

test('keeps core beta surfaces within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.publicTrack, fixturePosts.playlistSource],
  });

  const surfaces: Array<{ path: string; ready: () => Locator }> = [
    { path: '/', ready: () => page.getByTestId('home-search-input') },
    {
      path: '/post/post-public-track',
      ready: () => page.getByText(fixturePosts.publicTrack.title, { exact: true }).first(),
    },
    {
      path: '/add-music',
      ready: () => page.locator('[data-testid="add-music-input"]:visible').first(),
    },
    {
      path: '/profile/miagroove',
      ready: () => page.getByText(`@${fixtureUsers.member.username}`, { exact: true }).first(),
    },
  ];

  for (const surface of surfaces) {
    await page.goto(surface.path);
    await expectControlWithinViewport(surface.ready());
    await expectNoHorizontalOverflow(page);
  }
});

test('keeps onboarding actions reachable on mobile', async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
  });

  await page.goto('/onboarding');

  await expectControlWithinViewport(page.getByTestId('onboarding-start'));
  await expectNoHorizontalOverflow(page);
});
