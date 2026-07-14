import { expect, test, type Page } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

async function advanceToEmailConsent(page: Page) {
  await page.goto('/onboarding');
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-username').fill('freshhandle');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await page.getByTestId('onboarding-handle-next').click();
  await page.getByTestId('onboarding-avatar-next').click();
  await expect(page.getByTestId('onboarding-product-updates-email')).toBeVisible();
}

test('keeps product update email off by default during onboarding', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
  });

  await advanceToEmailConsent(page);
  await expect(page.getByTestId('onboarding-product-updates-email')).toHaveAttribute(
    'data-state',
    'unchecked',
  );
  await page.getByTestId('onboarding-finish-setup').click();

  await expect.poll(() => state.currentUser?.isOnboarded).toBe(true);
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: false, source: 'onboarding' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.newcomer.id)?.enabled).toBe(false);
});

test('records affirmative product update consent before onboarding completes', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
  });

  await advanceToEmailConsent(page);
  await page.getByTestId('onboarding-product-updates-email').click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect.poll(() => state.currentUser?.isOnboarded).toBe(true);
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: true, source: 'onboarding' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.newcomer.id)?.enabled).toBe(true);
});

test('lets account settings opt out of product update email', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    emailPreferencesByUserId: {
      [fixtureUsers.member.id]: true,
    },
  });

  await page.goto('/profile/miagroove/edit');
  const preferenceSwitch = page.locator(
    '[data-testid="settings-product-updates-email"]:visible',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  const loadRequestCount = state.emailPreferenceGetCount;
  expect(loadRequestCount).toBe(1);
  await preferenceSwitch.click();

  await expect(page.locator('[data-testid="email-preference-save-status"]:visible')).toHaveText(
    'Saved.',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'unchecked');
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: false, source: 'settings' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.member.id)?.enabled).toBe(false);
  expect(state.emailPreferenceGetCount).toBe(loadRequestCount);

  await page.setViewportSize({ width: 390, height: 667 });
  await expect(page.locator('[data-testid="settings-product-updates-email"]:visible')).toHaveAttribute(
    'data-state',
    'unchecked',
  );
  expect(state.emailPreferenceGetCount).toBe(loadRequestCount);
});

test('keeps failed onboarding consent visible and retryable', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
    emailPreferenceUpdateFailures: 1,
  });

  await advanceToEmailConsent(page);
  const preferenceSwitch = page.getByTestId('onboarding-product-updates-email');
  await preferenceSwitch.click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect(page.getByTestId('onboarding-submit-error')).toContainText(
    'Cassette is temporarily unavailable. Please try again.',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  expect(state.currentUser?.isOnboarded).toBe(false);
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: true, source: 'onboarding' },
  ]);

  await page.getByTestId('onboarding-finish-setup').click();

  await expect.poll(() => state.currentUser?.isOnboarded).toBe(true);
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: true, source: 'onboarding' },
    { enabled: true, source: 'onboarding' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.newcomer.id)?.enabled).toBe(true);
});

test('persists a later opt-out after profile completion initially fails', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
    profileUpdateFailures: 1,
  });

  await advanceToEmailConsent(page);
  const preferenceSwitch = page.getByTestId('onboarding-product-updates-email');
  await preferenceSwitch.click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect(page.getByTestId('onboarding-submit-error')).toBeVisible();
  expect(state.currentUser?.isOnboarded).toBe(false);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.newcomer.id)?.enabled).toBe(true);

  await preferenceSwitch.click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect.poll(() => state.currentUser?.isOnboarded).toBe(true);
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: true, source: 'onboarding' },
    { enabled: false, source: 'onboarding' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.newcomer.id)?.enabled).toBe(false);
});

test('reverts a failed settings change and retries the intended preference', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    emailPreferenceUpdateFailures: 1,
  });

  await page.goto('/profile/miagroove/edit');
  const preferenceSwitch = page.locator(
    '[data-testid="settings-product-updates-email"]:visible',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'unchecked');
  await preferenceSwitch.click();

  const error = page.locator('[role="alert"]:visible').filter({
    hasText: 'Cassette is temporarily unavailable. Please try again.',
  });
  await expect(error).toContainText('Your previous setting is still in place.');
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'unchecked');
  expect(state.emailPreferencesByUserId.has(fixtureUsers.member.id)).toBe(false);

  await error.getByRole('button', { name: 'Retry' }).click();

  await expect(page.locator('[data-testid="email-preference-save-status"]:visible')).toHaveText(
    'Saved.',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  await expect(page.locator('[data-testid="email-preference-sync-status"]:visible')).toContainText(
    'Email provider sync is pending.',
  );
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: true, source: 'settings' },
    { enabled: true, source: 'settings' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.member.id)?.enabled).toBe(true);
});
