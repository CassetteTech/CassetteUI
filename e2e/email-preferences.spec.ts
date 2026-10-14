import { expect, type Page, test } from '@playwright/test';
import { fixtureCuratorPage, fixtureNoMembershipStatus, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const MEMBER_SETTINGS = '/profile/miagroove/edit?tab=account';
const productUpdatesSwitch = (page: Page) => page.locator('[data-testid="settings-product-updates-email"]:visible');
const digestSwitch = (page: Page) => page.locator('[data-testid="settings-curator-digest-email"]:visible');
const digestSaveStatus = (page: Page) => page.locator('[data-testid="curator-digest-save-status"]:visible');
const digestNote = (page: Page) => page.locator('[data-testid="curator-digest-product-updates-note"]:visible');

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
  await expect(page.getByTestId('settings-curator-digest-email')).toHaveCount(0);
  await page.getByTestId('onboarding-finish-setup').click();

  await expect.poll(() => state.currentUser?.isOnboarded).toBe(true);
  expect(state.emailPreferenceGetCount).toBe(0);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
  expect(state.curatorDigestUpdateAttempts).toEqual([]);
});

test('shows product update email as on by default in account settings', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
  });

  await page.goto('/profile/miagroove/edit?tab=account');
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

  await page.goto('/profile/miagroove/edit?tab=account');
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

  await page.goto('/profile/miagroove/edit?tab=account');
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

  await page.goto('/profile/miagroove/edit?tab=account');
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

test('reports a failed email save that lands after the person leaves the Account tab', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
    emailPreferenceUpdateFailures: 1,
  });
  await page.route('**/api/v1/email/preferences/product_updates', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fallback();
  });

  await page.goto('/profile/miagroove/edit?tab=account');
  const main = page.getByRole('main').last();
  await main.locator('[data-testid="settings-product-updates-email"]:visible').click();
  await main.getByRole('tab', { name: 'Profile' }).click();

  await expect(page.getByText('Your email preference was not saved.')).toBeVisible();
});

test('shows the curator digest off by default and saves an explicit keyboard opt-in that persists', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
  });

  await page.goto(MEMBER_SETTINGS);
  const main = page.getByRole('main').last();
  const digest = main.getByRole('switch', { name: 'Receive the weekly curator digest email' });
  await expect(digest).toHaveAttribute('data-state', 'unchecked');
  await expect(main.getByText('Weekly on Mondays: up to five new public posts from curators you follow or support. Off by default.')).toBeVisible();
  await expect(productUpdatesSwitch(page)).toHaveAttribute('data-state', 'checked');
  await expect(digestNote(page)).toHaveCount(0);

  await digest.focus();
  await page.keyboard.press('Space');
  await expect(digestSaveStatus(page)).toHaveText('Saved.');
  await expect(digest).toHaveAttribute('data-state', 'checked');
  expect(state.curatorDigestUpdateAttempts).toEqual([{ enabled: true, source: 'settings' }]);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
  expect(state.curatorDigestByUserId.get(fixtureUsers.member.id)?.consentTextVersion).toBe('curator_digest_v1');
  expect(state.emailPreferencesByUserId.get(fixtureUsers.member.id)?.lastChangedSource).toBe('account_default');

  await page.reload();
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'checked');
  await digestSwitch(page).click();
  await expect(digestSaveStatus(page)).toHaveText('Saved.');
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'unchecked');
  expect(state.curatorDigestUpdateAttempts).toEqual([
    { enabled: true, source: 'settings' },
    { enabled: false, source: 'settings' },
  ]);
  expect(state.emailPreferencesByUserId.get(fixtureUsers.member.id)?.enabled).toBe(true);
});

test('explains that product updates off pauses the digest without changing either choice', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    emailPreferencesByUserId: { [fixtureUsers.member.id]: false },
    curatorDigestEnabledUserIds: [fixtureUsers.member.id],
  });

  await page.goto(MEMBER_SETTINGS);
  await expect(productUpdatesSwitch(page)).toHaveAttribute('data-state', 'unchecked');
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'checked');
  await expect(digestNote(page)).toHaveText(
    'Product updates are off, so the digest is paused. Your digest choice stays on and resumes when product updates are on.',
  );

  await productUpdatesSwitch(page).click();
  await expect(productUpdatesSwitch(page)).toHaveAttribute('data-state', 'checked');
  await expect(digestNote(page)).toHaveCount(0);
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'checked');
  expect(state.emailPreferenceUpdateAttempts).toEqual([{ enabled: true, source: 'settings' }]);
  expect(state.curatorDigestUpdateAttempts).toEqual([]);
});

test('reverts a failed digest save, keeps product updates, and retries the intended choice', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
    curatorDigestUpdateFailures: 1,
  });

  await page.goto(MEMBER_SETTINGS);
  await digestSwitch(page).click();

  const error = page.locator('[role="alert"]:visible').filter({
    hasText: 'Cassette is temporarily unavailable. Please try again.',
  });
  await expect(error).toContainText('Your previous setting is still in place.');
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'unchecked');
  await expect(digestSaveStatus(page)).toHaveCount(0);
  await expect(productUpdatesSwitch(page)).toHaveAttribute('data-state', 'checked');
  expect(state.curatorDigestByUserId.get(fixtureUsers.member.id)).toBeUndefined();

  await error.getByRole('button', { name: 'Retry' }).click();
  await expect(digestSaveStatus(page)).toHaveText('Saved.');
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'checked');
  expect(state.curatorDigestUpdateAttempts).toEqual([
    { enabled: true, source: 'settings' },
    { enabled: true, source: 'settings' },
  ]);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
});

test('an unavailable preference endpoint shows no saved or off value until a retry loads it', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    defaultEnrolledUserIds: [fixtureUsers.member.id],
    curatorDigestEnabledUserIds: [fixtureUsers.member.id],
    emailPreferenceLoadFailures: 1,
  });

  await page.goto(MEMBER_SETTINGS);
  const error = page.locator('[role="alert"]:visible').filter({
    hasText: 'Cassette is temporarily unavailable. Please try again.',
  });
  await expect(error).toBeVisible();
  await expect(productUpdatesSwitch(page)).toHaveCount(0);
  await expect(digestSwitch(page)).toHaveCount(0);
  await expect(page.getByText('Saved', { exact: false }).filter({ visible: true })).toHaveCount(0);
  await expect(digestNote(page)).toHaveCount(0);

  await error.getByRole('button', { name: 'Retry' }).click();
  await expect(productUpdatesSwitch(page)).toHaveAttribute('data-state', 'checked');
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'checked');
  expect(state.emailPreferenceGetCount).toBe(2);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
  expect(state.curatorDigestUpdateAttempts).toEqual([]);
});

test('a Follow never turns on the digest, and each viewer sees only their own choice', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
    defaultEnrolledUserIds: [fixtureUsers.viewer.id, fixtureUsers.member.id],
    curatorDigestEnabledUserIds: [fixtureUsers.member.id],
  });

  const name = fixtureCuratorPage.curator.displayName!;
  await page.goto(`/profile/${fixtureCuratorPage.curator.username}`);
  await page.getByRole('button', { name: `Follow ${name}`, exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Following', { exact: true }).filter({ visible: true })).toBeVisible();

  await page.goto(`/profile/${fixtureUsers.viewer.username}/edit?tab=account`);
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'unchecked');
  expect(state.curatorDigestByUserId.has(fixtureUsers.viewer.id)).toBe(false);

  state.currentUser = { ...fixtureUsers.member };
  await page.goto(MEMBER_SETTINGS);
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'checked');

  state.currentUser = { ...fixtureUsers.viewer };
  await page.goto(`/profile/${fixtureUsers.viewer.username}/edit?tab=account`);
  await expect(digestSwitch(page)).toHaveAttribute('data-state', 'unchecked');
  expect(state.curatorDigestUpdateAttempts).toEqual([]);
  expect(state.emailPreferenceUpdateAttempts).toEqual([]);
});
