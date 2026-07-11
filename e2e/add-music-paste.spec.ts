import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { dispatchPaste } from './support/paste';

test('converts a pasted add-music link with the drafted description and saves it to the profile', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/add-music');
  await page
    .locator(
      'textarea[placeholder="Tell us how you feel about the music"]:visible',
    )
    .fill('Locked in for every late-night drive.');

  await dispatchPaste(
    page,
    'add-music-input',
    fixtureConvertTemplates.addMusicTrack.originalUrl,
  );

  await expect(
    page.locator('p:visible').filter({ hasText: 'Spotify link pasted' }),
  ).toBeVisible();
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  const postMain = page.getByRole('main').last();
  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(postMain).toContainText('Blue Monday');

  await page.goto('/profile/miagroove?tab=tracks');
  await expect(page.getByRole('main').last()).toContainText('Blue Monday');
  await expect(page.getByRole('main').last()).toContainText(
    'Locked in for every late-night drive.',
  );
});

test('commits a typed add-music link on Enter so it can be submitted', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/add-music');
  const input = page.locator('[data-testid="add-music-input"]:visible');
  await input.pressSequentially(fixtureConvertTemplates.addMusicTrack.originalUrl);
  await input.press('Enter');

  await expect(
    page.locator('p:visible').filter({ hasText: 'Spotify link pasted' }),
  ).toBeVisible();
  await expect(
    page.locator(
      'textarea[placeholder="Tell us how you feel about the music"]:visible',
    ),
  ).toBeVisible();

  await page
    .locator(
      'textarea[placeholder="Tell us how you feel about the music"]:visible',
    )
    .fill('Typed by hand and still ready to post.');
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText('Blue Monday');
  await expect(page.getByRole('main').last()).toContainText('Typed by hand and still ready to post.');
});

test('shows validation feedback for unsupported pasted links without leaving add-music', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/add-music');
  await dispatchPaste(page, 'add-music-input', 'https://www.youtube.com/watch?v=not-supported');

  await expect(page).toHaveURL('/add-music');
  await expect(
    page.locator('p:visible').filter({
      hasText:
        "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.",
    }),
  ).toBeVisible();
});

test('preserves the drafted post after a temporary conversion failure and retries once', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  let conversionAttempts = 0;
  await page.route('**/api/v1/convert', async (route) => {
    conversionAttempts += 1;
    if (conversionAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'upstream unavailable',
          error_code: 'UPSTREAM_UNAVAILABLE',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/add-music');
  const description = page.locator(
    'textarea[placeholder="Tell us how you feel about the music"]:visible',
  );
  await description.fill('Keep this thought through a retry.');
  await dispatchPaste(
    page,
    'add-music-input',
    fixtureConvertTemplates.addMusicTrack.originalUrl,
  );

  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL('/add-music');
  await expect(
    page.locator('p:visible').filter({
      hasText: 'Cassette is temporarily unavailable. Please try again.',
    }),
  ).toBeVisible();
  await expect(description).toHaveValue('Keep this thought through a retry.');
  await expect(page.locator('p:visible').filter({ hasText: 'Spotify link pasted' })).toBeVisible();

  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText('Keep this thought through a retry.');
  expect(conversionAttempts).toBe(2);
});
