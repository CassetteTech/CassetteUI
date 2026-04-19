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
  await profileMain
    .locator('textarea[placeholder="Tell us about yourself..."]:visible')
    .fill('Documenting the songs that outlast the week.');

  await profileMain.locator('button:has-text("Add More"):visible').click();
  await profileMain.locator('[data-testid="music-service-toggle-deezer"]:visible').click();
  await profileMain.locator('[data-testid="profile-save"]:visible').click();

  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  const updatedProfileMain = page.getByRole('main').last();
  await expect(updatedProfileMain).toContainText('Mia Afterglow');
  await expect(updatedProfileMain).toContainText('Documenting the songs that outlast the week.');

  await page.goto('/profile/miagroove/edit');
  const reopenedProfileMain = page.getByRole('main').last();
  await reopenedProfileMain.locator('button:has-text("Add More"):visible').click();
  await expect(
    reopenedProfileMain.locator('[data-testid="music-service-toggle-deezer"]:visible'),
  ).toHaveAttribute('data-state', 'checked');
});

test('crops a new avatar before saving profile edits', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/profile/miagroove/edit');
  await page.getByTestId('profile-avatar-file-input').setInputFiles(AVATAR_FILE);
  await expect(page.getByRole('dialog', { name: 'Adjust profile photo' })).toBeVisible();
  await page.getByTestId('avatar-crop-apply').click();
  await page.getByTestId('profile-save').click();

  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
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
  await profileMain.locator('input[value="private"]:visible').check();
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
