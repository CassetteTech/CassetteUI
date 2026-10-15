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

  // The own-profile shortcut is Curator Studio, the curator's home.
  await page.goto('/profile');
  await expect(page).toHaveURL('/studio/music');

  await page.goto('/profile/miagroove/edit');
  const profileMain = page.getByRole('main').last();
  await profileMain.locator('input[name="fullName"]:visible').fill('Mia Afterglow');
  await profileMain.locator('textarea#profile-bio:visible').fill('Documenting the songs that outlast the week.');
  await profileMain.getByRole('button', { name: 'Add link' }).click();
  await profileMain.getByLabel('Link 1', { exact: true }).fill('instagram.com/miagroove');

  const spotifyPreference = profileMain.locator(
    '[data-testid="music-service-toggle-spotify"]:visible',
  );
  await spotifyPreference.click();
  await expect(spotifyPreference).toHaveAttribute('data-state', 'unchecked');
  const saveRequest = page.waitForRequest(
    (request) => request.method() === 'PUT' && new URL(request.url()).pathname === '/api/v1/profile',
  );
  await profileMain.locator('[data-testid="profile-save"]:visible').click();
  expect((await saveRequest).postData()).toContain('https://instagram.com/miagroove');

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
  await profileMain.getByRole('tab', { name: 'Account' }).click();
  await expect(page).toHaveURL(/\/profile\/miagroove\/edit\?tab=account$/);
  await profileMain.locator('label:visible').filter({ hasText: /^Private$/ }).click();
  await profileMain.locator('[data-testid="profile-save"]:visible').click();

  await expect(page).toHaveURL(/\/profile\/miagroove(?:\?tab=playlists)?$/);
  await expect(page.getByRole('tab', { name: /Liked/ })).toBeVisible();

  const viewerPage = await browser.newPage();
  await mockCassetteApp(viewerPage, {
    currentUser: fixtureUsers.viewer,
    users: Array.from(state.usersById.values()),
  });

  await viewerPage.goto('/profile/miagroove?tab=liked');
  await expect(viewerPage).toHaveURL(/\/profile\/miagroove$/);
  await expect(viewerPage.getByRole('tab', { name: /Liked/ })).toHaveCount(0);
  await viewerPage.close();
});

test('opens the Profile tab and focuses a taken username when saving from the Account tab', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    usernameAvailability: { samloops: false },
  });

  await page.goto('/profile/miagroove/edit');
  const profileMain = page.getByRole('main').last();
  await profileMain.locator('input#profile-username:visible').fill('samloops');
  await expect(profileMain.getByText('Username already exists. Please choose a different one.')).toBeVisible();

  await profileMain.getByRole('tab', { name: 'Account' }).click();
  await profileMain.locator('[data-testid="profile-save"]:visible').click();

  await expect(profileMain.getByRole('tab', { name: 'Profile' })).toHaveAttribute('data-state', 'active');
  await expect(profileMain.locator('input#profile-username')).toBeFocused();
  await expect(page).toHaveURL(/\/profile\/miagroove\/edit$/);
});

test('follows URL changes to the settings tab while the form stays mounted', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/profile/miagroove/edit');
  const profileMain = page.getByRole('main').last();
  const accountTab = profileMain.getByRole('tab', { name: 'Account' });
  await expect(profileMain.getByRole('tab', { name: 'Profile' })).toHaveAttribute('data-state', 'active');

  await page.evaluate(() => window.history.pushState(null, '', '/profile/miagroove/edit?tab=account'));
  await expect(accountTab).toHaveAttribute('data-state', 'active');

  await page.goBack();
  await expect(page).toHaveURL(/\/profile\/miagroove\/edit$/);
  await expect(accountTab).toHaveAttribute('data-state', 'inactive');
});
