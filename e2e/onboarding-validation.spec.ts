import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('blocks onboarding progression until the username becomes available', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
    usernameAvailability: {
      freshhandle: false,
      stagepilot: true,
    },
  });

  await page.goto('/onboarding');
  await page.getByTestId('onboarding-start').click();

  await expect(page.getByTestId('onboarding-display-name')).toHaveValue('Fresh Finds');

  const nextButton = page.getByTestId('onboarding-handle-next');
  await page.getByTestId('onboarding-username').fill('freshhandle');
  await expect(page.getByText('Username is already taken')).toBeVisible();
  await expect(nextButton).toBeDisabled();

  await page.getByTestId('onboarding-username').fill('stagepilot');
  await expect(page.getByText('Username is available!')).toBeVisible();
  await expect(nextButton).toBeEnabled();
});
