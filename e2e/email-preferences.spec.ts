import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('onboarding contains no product-updates email control and makes no preference requests', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.newcomer,
  });

  await page.goto('/onboarding');
  await page.getByTestId('onboarding-start').click();

  await page.getByTestId('onboarding-username').fill('freshhandle');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await expect(page.getByTestId('settings-product-updates-email')).toHaveCount(0);
  await expect(page.getByTestId('onboarding-product-updates-email')).toHaveCount(0);
  await page.getByTestId('onboarding-handle-next').click();

  await expect(page.getByTestId('onboarding-avatar-next')).toBeVisible();
  await expect(page.getByTestId('settings-product-updates-email')).toHaveCount(0);
  await expect(page.getByTestId('onboarding-product-updates-email')).toHaveCount(0);
  await page.getByTestId('onboarding-avatar-next').click();

  await expect(page.getByTestId('onboarding-finish-setup')).toBeVisible();
  await expect(page.getByTestId('settings-product-updates-email')).toHaveCount(0);
  await expect(page.getByTestId('onboarding-product-updates-email')).toHaveCount(0);
  await expect(
    page.getByRole('switch', { name: /product|release|email/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('checkbox', { name: /product|release|email/i }),
  ).toHaveCount(0);
  await page.getByTestId('onboarding-finish-setup').click();

  await expect.poll(() => state.currentUser?.isOnboarded).toBe(true);
  expect(state.emailPreferenceGetCount).toBe(0);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
});

test('shows product update email as on by default in account settings', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    // Default enrollment happens in Bridge (signup/backfill): the account
    // arrives with an enabled account_default row, not a missing row.
    defaultEnrolledUserIds: [fixtureUsers.member.id],
  });

  await page.goto('/profile/miagroove/edit');
  const preferenceSwitch = page.locator(
    '[data-testid="settings-product-updates-email"]:visible',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  expect(state.emailPreferenceGetCount).toBe(1);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
});

test('lets account settings opt out of product update email and persists across reload', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
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
    'Saved. This can take a few minutes to take effect.',
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

  await page.reload();
  await expect(page.locator('[data-testid="settings-product-updates-email"]:visible')).toHaveAttribute(
    'data-state',
    'unchecked',
  );
  expect(state.emailPreferenceGetCount).toBeGreaterThan(loadRequestCount);
});

test('lets a previously opted-out account re-enable product update email', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    emailPreferencesByUserId: {
      [fixtureUsers.member.id]: false,
    },
  });

  await page.goto('/profile/miagroove/edit');
  const preferenceSwitch = page.locator(
    '[data-testid="settings-product-updates-email"]:visible',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'unchecked');
  await preferenceSwitch.click();

  await expect(page.locator('[data-testid="email-preference-save-status"]:visible')).toHaveText(
    'Saved. This can take a few minutes to take effect.',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: true, source: 'settings' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.member.id)?.enabled).toBe(true);
});

test('reverts a failed settings opt-out and retries the intended preference', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
    emailPreferenceUpdateFailures: 1,
  });

  await page.goto('/profile/miagroove/edit');
  const preferenceSwitch = page.locator(
    '[data-testid="settings-product-updates-email"]:visible',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  await preferenceSwitch.click();

  const error = page.locator('[role="alert"]:visible').filter({
    hasText: 'Cassette is temporarily unavailable. Please try again.',
  });
  await expect(error).toContainText('Your previous setting is still in place.');
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'checked');
  const untouched = state.emailPreferencesByUserId.get(fixtureUsers.member.id);
  expect(untouched?.enabled).toBe(true);
  expect(untouched?.lastChangedSource).toBe('account_default');
  expect(untouched?.consentedAtUtc).toBeNull();

  await error.getByRole('button', { name: 'Retry' }).click();

  await expect(page.locator('[data-testid="email-preference-save-status"]:visible')).toHaveText(
    'Saved. This can take a few minutes to take effect.',
  );
  await expect(preferenceSwitch).toHaveAttribute('data-state', 'unchecked');
  expect(state.emailPreferenceUpdateAttempts).toEqual([
    { enabled: false, source: 'settings' },
    { enabled: false, source: 'settings' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.member.id)?.enabled).toBe(false);
});
