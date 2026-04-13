import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

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

  await page.getByTestId('onboarding-avatar-next').click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect(page).toHaveURL('/add-music');
  await expect(page.locator('[data-testid="add-music-input"]:visible')).toBeVisible();
});
