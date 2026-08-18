/** Verifies Add Music creates a profile post with the selected authoring fields. */

import { expect, test } from '@playwright/test';
import {
  fixtureConvertTemplates,
  fixtureActiveCuratorProfile,
  fixtureActiveMemberPostPlan,
  fixtureCuratorProActiveStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('creates a post from add-music search and shows it on the profile', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile: fixtureActiveCuratorProfile,
    curatorProStatus: fixtureCuratorProActiveStatus,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });

  await page.goto('/add-music');
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
  await page.locator('#add-music-privacy:visible').selectOption('subscriber');
  const conversionRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname === '/api/v1/convert' && request.method() === 'POST');
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();
  expect((await conversionRequest).postDataJSON()).toMatchObject({ privacy: 'subscriber' });

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
