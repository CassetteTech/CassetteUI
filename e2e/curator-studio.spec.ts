import { expect, type Page, test } from '@playwright/test';
import type { CuratorPayoutAccount } from '../src/services/curator';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const STUDIO_PATH = '/studio/curator';
const PAYOUT_URL = 'https://connect.stripe.test/payout-onboarding';

const payoutAccount = (
  overrides: Partial<CuratorPayoutAccount> = {},
): CuratorPayoutAccount => ({
  onboardingStatus: 'onboarding',
  transfersCapabilityStatus: null,
  requirementsDue: false,
  capabilityCheckedAtUtc: null,
  ...overrides,
});

async function hostPayoutPage(page: Page, url = PAYOUT_URL) {
  await page.route(url, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<main>Secure payout setup</main>',
  }));
}

test('redirects anonymous visitors away from the curator studio', async ({ page }) => {
  await mockCassetteApp(page);

  await page.goto(STUDIO_PATH);

  await expect(page).toHaveURL('/auth/signin');
  await expect(page.getByRole('link', { name: 'Curator Studio' })).toHaveCount(0);
});

test('lets a signed-in user create and edit a free curator profile', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto(STUDIO_PATH);

  await expect(page.getByRole('heading', { level: 1, name: 'Curator Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Curator Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your free curator profile' })).toBeVisible();
  await expect(page.getByText('Not created', { exact: true })).toBeVisible();

  await page.getByLabel('Headline').fill('Weekly finds for open ears');
  await page.getByLabel('About').fill('Independent picks from across the platform.');
  await page.getByLabel('Genres').fill('Electronic, Jazz');
  await page.getByLabel('Platforms').fill('Spotify, Apple Music');
  await page.getByRole('button', { name: 'Create curator profile' }).click();

  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  await expect(page.getByText('active', { exact: true })).toBeVisible();
  await expect.poll(() => state.curatorProfile).toMatchObject({
    status: 'active',
    headline: 'Weekly finds for open ears',
    about: 'Independent picks from across the platform.',
    declaredGenres: ['Electronic', 'Jazz'],
    declaredPlatforms: ['Spotify', 'Apple Music'],
  });

  await page.getByLabel('Headline').fill('Fresh finds every Friday');
  await page.getByLabel('Genres').fill('Electronic, Soul');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect.poll(() => state.curatorProfile?.headline).toBe('Fresh finds every Friday');
  await expect.poll(() => state.curatorProfile?.declaredGenres).toEqual(['Electronic', 'Soul']);

  await page.reload();
  await expect(page.getByLabel('Headline')).toHaveValue('Fresh finds every Friday');
  await expect(page.getByLabel('Genres')).toHaveValue('Electronic, Soul');
});

test('hands a user with no payout account to secure onboarding', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });
  await hostPayoutPage(page);

  await page.goto(STUDIO_PATH);

  const card = page.getByTestId('curator-payout-card');
  await expect(card).toContainText('Not started');
  await expect(page.getByTestId('curator-pro-subscribe')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Create curator profile' })).toBeEnabled();

  state.curatorPayoutOnboardingFailuresRemaining = 1;
  await page.getByTestId('curator-payout-onboarding').click();
  await expect(card.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

  await page.getByTestId('curator-payout-onboarding').click();

  await expect(page).toHaveURL(PAYOUT_URL);
  expect(state.curatorPayoutOnboardingRequests).toBe(2);
});

test('refreshes capability truth after hosted onboarding returns', async ({ page }) => {
  const active = payoutAccount({
    onboardingStatus: 'active',
    transfersCapabilityStatus: 'active',
    capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
  });
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPayoutAccount: payoutAccount(),
    curatorPayoutRefreshAccount: active,
  });

  await page.goto(`${STUDIO_PATH}?payout=return`);

  await expect(page.getByTestId('curator-payout-notice')).toHaveText('Payout setup is complete.');
  await expect(page.getByTestId('curator-payout-card')).toContainText('Ready');
  await expect(page).not.toHaveURL(/payout=/);
  expect(state.curatorPayoutStatusRequests).toEqual([true]);
  expect(state.curatorPayoutAccount).toEqual(active);
});

test('mints a new hosted link when the provider refresh URL returns', async ({ page }) => {
  const renewedUrl = `${PAYOUT_URL}-renewed`;
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPayoutAccount: payoutAccount(),
    curatorPayoutOnboardingUrl: renewedUrl,
  });
  await hostPayoutPage(page, renewedUrl);

  await page.goto(`${STUDIO_PATH}?payout=refresh`);
  await expect(page.getByText('Your secure payout setup link expired.')).toBeVisible();
  expect(state.curatorPayoutOnboardingRequests).toBe(0);

  await page.getByRole('button', { name: 'Open a new setup link' }).click();

  await expect(page).toHaveURL(renewedUrl);
  expect(state.curatorPayoutOnboardingRequests).toBe(1);
  expect(state.curatorPayoutStatusRequests).toEqual([]);
});

test('keeps free and Pro surfaces usable through restricted and failed payout status', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'restricted',
      transfersCapabilityStatus: 'restricted',
      requirementsDue: true,
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(STUDIO_PATH);

  const card = page.getByTestId('curator-payout-card');
  await expect(card).toContainText('Needs attention');
  await expect(card).toContainText('more information');

  state.curatorPayoutStatusFailuresRemaining = 10;
  await page.reload();
  await expect(card.getByRole('alert')).toBeVisible({ timeout: 10_000 });

  await page.getByLabel('Headline').fill('Free profile survives payout errors');
  await page.getByRole('button', { name: 'Create curator profile' }).click();

  await expect.poll(() => state.curatorProfile?.headline).toBe('Free profile survives payout errors');
  await expect(page.getByTestId('curator-pro-subscribe')).toBeEnabled();
});
