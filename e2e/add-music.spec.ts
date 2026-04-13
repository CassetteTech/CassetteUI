import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('creates a post from add-music search and shows it on the profile', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/add-music');
  await page.locator('[data-testid="add-music-input"]:visible').fill('blue monday');
  const firstSearchResult = page.locator('[data-testid="search-result-track-search-track-1"]:visible');
  await expect(firstSearchResult).toBeVisible();
  await firstSearchResult.click();

  await page
    .locator(
      '[placeholder="Let us know a little bit about this song or playlist!"]:visible',
    )
    .fill(
      'A permanent resident in my rotation.',
    );
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

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
