import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const AVATAR_FILE = {
  name: 'avatar.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=',
    'base64',
  ),
};

test('redirects /profile and persists profile edits and music service preferences', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);

  await page.goto('/profile/miagroove/edit');
  const profileMain = page.getByRole('main').last();
  await profileMain.locator('input[name="fullName"]:visible').fill('Mia Afterglow');
  await profileMain.locator('textarea#profile-bio:visible').fill('Documenting the songs that outlast the week.');

  await profileMain.locator('button:has-text("Add More"):visible').click();
  const spotifyPreference = profileMain.locator(
    '[data-testid="music-service-toggle-spotify"]:visible',
  );
  await spotifyPreference.click();
  await expect(spotifyPreference).toHaveAttribute('data-state', 'unchecked');
  await profileMain.locator('[data-testid="profile-save"]:visible').click();

  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  const updatedProfileMain = page.getByRole('main').last();
  await expect(updatedProfileMain).toContainText('Mia Afterglow');
  await expect(updatedProfileMain).toContainText('Documenting the songs that outlast the week.');

  await page.goto('/profile/miagroove/edit');
  const reopenedProfileMain = page.getByRole('main').last();
  await expect(
    reopenedProfileMain.locator('[data-testid="music-service-toggle-spotify"]:visible'),
  ).toHaveAttribute('data-state', 'unchecked');
});

test('crops a new avatar before saving profile edits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 568 });
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/profile/miagroove/edit');
  await page.getByTestId('profile-avatar-file-input').first().setInputFiles(AVATAR_FILE);
  const cropDialog = page.getByRole('dialog', { name: 'Adjust profile photo' });
  await expect(cropDialog).toBeVisible();
  const dialogSize = await cropDialog.evaluate((element) => ({
    clientHeight: element.clientHeight,
    viewportHeight: window.innerHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(dialogSize.clientHeight).toBeLessThanOrEqual(dialogSize.viewportHeight - 32);
  expect(dialogSize.overflowY).toBe('auto');

  const applyCrop = page.getByTestId('avatar-crop-apply');
  await applyCrop.scrollIntoViewIfNeeded();
  await expect(applyCrop).toBeVisible();
  await applyCrop.click();
  await page.locator('[data-testid="profile-save"]:visible').click();

  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
});

test('keeps profile edits visible and retryable after a save failure', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    profileUpdateFailures: 1,
  });

  await page.goto('/profile/miagroove/edit');
  const profileMain = page.getByRole('main').last();
  const fullName = profileMain.locator('input[name="fullName"]:visible');
  await fullName.fill('Mia Retry');
  await profileMain.locator('[data-testid="profile-save"]:visible').click();

  await expect(profileMain.locator('[role="alert"]:visible')).toContainText(
    'Failed to save profile. Please try again.',
  );
  await expect(profileMain.locator('[role="alert"]:visible')).not.toContainText('S3');
  await expect(fullName).toHaveValue('Mia Retry');

  await profileMain.locator('[data-testid="profile-save"]:visible').click();
  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  await expect(page.getByRole('main').last()).toContainText('Mia Retry');
});

test('persists liked-post privacy changes and hides the liked tab from other viewers', async ({
  page,
  browser,
}) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/profile/miagroove/edit');
  const profileMain = page.getByRole('main').last();
  await profileMain.locator('label:visible').filter({ hasText: /^Private$/ }).click();
  await profileMain.locator('[data-testid="profile-save"]:visible').click();

  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  await expect(page.getByRole('button', { name: /Liked/ })).toBeVisible();

  const viewerPage = await browser.newPage();
  await mockCassetteApp(viewerPage, {
    currentUser: fixtureUsers.viewer,
    users: Array.from(state.usersById.values()),
  });

  await viewerPage.goto('/profile/miagroove?tab=liked');
  await expect(viewerPage).toHaveURL(/\/profile\/miagroove\?tab=playlists$/);
  await expect(viewerPage.getByRole('button', { name: /Liked/ })).toHaveCount(0);
  await viewerPage.close();
});
