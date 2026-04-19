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

test('resumes add-music after a gated visitor completes onboarding', async ({ page }) => {
  await mockCassetteApp(page, {
    googleAuthUser: fixtureUsers.newcomer,
  });

  await page.goto('/add-music');
  await expect(page).toHaveURL(/\/auth\/signin\?redirect=\/add-music$/);

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/onboarding');

  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-username').fill('freshhandle');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await page.getByTestId('onboarding-handle-next').click();

  await page.getByTestId('onboarding-avatar-file-input').setInputFiles(AVATAR_FILE);
  await expect(page.getByRole('dialog', { name: 'Adjust profile photo' })).toBeVisible();
  await page.getByTestId('avatar-crop-apply').click();
  await page.getByTestId('onboarding-avatar-next').click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect(page).toHaveURL('/add-music');
  await expect(page.locator('[data-testid="add-music-input"]:visible')).toBeVisible();
});
