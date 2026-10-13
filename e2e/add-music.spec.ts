/** Verifies Add Music creates a profile post with the selected authoring fields. */

import { expect, test } from '@playwright/test';
import {
  fixtureConvertTemplates,
  fixtureActiveCuratorProfile,
  fixtureActiveMemberPostPlan,
  fixtureCuratorPage,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('creates a post from add-music search and shows it on the profile', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    // A curator who can lock posts has a curator page; it starts empty and the new post joins it.
    curatorPage: {
      ...fixtureCuratorPage,
      curator: { ...fixtureCuratorPage.curator, username: fixtureUsers.member.username },
      viewer: { isOwner: true, isMember: false, hasMemberBadge: false },
      posts: { ...fixtureCuratorPage.posts, items: [], totalItems: 0 },
    },
  });

  await page.goto('/studio/music/new');
  await page.locator('[data-testid="add-music-input"]:visible').fill('blue monday');
  const firstSearchResult = page.locator('[data-testid="search-result-track-search-track-1"]:visible');
  await expect(firstSearchResult).toBeVisible();
  await firstSearchResult.click();

  await page
    .locator(
      '[placeholder="Tell us how you feel about the music"]:visible',
    )
    .fill(
      'A permanent resident in my rotation.',
    );
  await expect(page.getByRole('heading', { name: 'Who can open it', level: 2 })).toBeVisible();
  await page.getByRole('radio', { name: 'Members' }).click();
  await expect(page.getByRole('radio', { name: 'Members' })).toBeChecked();
  // Hold the conversion so the in-flight form can be checked before the fixture answers.
  let releaseConversion = () => {};
  const conversionHeld = new Promise<void>((resolve) => {
    releaseConversion = resolve;
  });
  await page.route('**/api/v1/convert', async (route) => {
    await conversionHeld;
    await route.fallback();
  });
  const conversionRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname === '/api/v1/convert' && request.method() === 'POST');
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();
  expect((await conversionRequest).postDataJSON()).toMatchObject({ privacy: 'subscriber' });
  // The request already carries the setting, so the control holds until it settles.
  for (const name of ['Public', 'Members', 'Private']) {
    await expect(page.getByRole('radio', { name })).toHaveAttribute('aria-disabled', 'true');
  }
  await page.getByRole('radio', { name: 'Members' }).press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Members' })).toBeChecked();
  releaseConversion();

  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText('Blue Monday');

  await page.goto('/profile/miagroove');
  await expect(page.getByRole('main').last()).toContainText(
    fixtureConvertTemplates.addMusicTrack.title,
  );
  await expect(page.getByRole('main').last()).toContainText(
    'A permanent resident in my rotation.',
  );
});
