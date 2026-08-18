/** Tests free curator profiles, payout onboarding, plan economics, and earnings in Studio. */

import { expect, type Page, test } from '@playwright/test';
import type {
  CuratorPayoutAccount,
  CuratorProfile,
} from '../src/services/curator';
import type { CuratorPricing } from '../src/services/curator-plans';
import type { CuratorEarningsHistoryItem } from '../src/services/curator-earnings';
import {
  fixtureCuratorProActiveStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { openStudioStep } from './support/studio-steps';

const STUDIO_PATH = '/studio/curator';
const PAYOUT_URL = 'https://connect.stripe.test/payout-onboarding';

const curatorProfile: CuratorProfile = {
  id: 'cpr_FixtureStudioProfile01',
  status: 'active',
  headline: 'Independent weekly finds',
  about: 'A free curator profile.',
  declaredGenres: ['Electronic'],
  declaredPlatforms: ['Spotify'],
  suspensionReason: null,
  createdAtUtc: '2026-08-16T12:00:00Z',
  statusChangedAtUtc: '2026-08-16T12:00:00Z',
};

const curatorBornePricing: CuratorPricing = {
  curatorProMonthlyPriceMinor: 500,
  currency: 'USD',
  platformFeeBps: 1000,
  serviceFeeBps: 0,
  serviceFeeFixedMinor: 0,
  processingBorneBy: 'curator',
  processingFeeBps: 360,
  processingFeeFixedMinor: 30,
  payoutOpsFeeBps: 0,
  payoutCadence: 'monthly',
  minPayoutMinor: 1000,
};

const earningsItems: CuratorEarningsHistoryItem[] = [
  {
    kind: 'allocation',
    amountMinor: 125,
    currency: 'USD',
    status: 'forfeited',
    occurredAtUtc: '2026-08-16T12:00:00Z',
    payableAtUtc: '2026-08-30T12:00:00Z',
  },
  {
    kind: 'transfer',
    amountMinor: 900,
    currency: 'USD',
    status: 'succeeded',
    occurredAtUtc: '2026-08-15T12:00:00Z',
  },
  {
    kind: 'allocation',
    amountMinor: 425,
    currency: 'USD',
    status: 'accrued',
    occurredAtUtc: '2026-08-14T12:00:00Z',
    payableAtUtc: '2026-08-28T12:00:00Z',
  },
  ...Array.from({ length: 8 }, (_, index): CuratorEarningsHistoryItem => ({
    kind: 'allocation',
    amountMinor: 200 + index,
    currency: 'USD',
    status: 'accrued',
    occurredAtUtc: `2026-08-${String(13 - index).padStart(2, '0')}T12:00:00Z`,
    payableAtUtc: `2026-08-${String(27 - index).padStart(2, '0')}T12:00:00Z`,
  })),
];

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
  // After reload the accordion opens the next unfinished step, not the profile.
  await openStudioStep(page, 'studio-profile');
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
  await openStudioStep(page, 'studio-payouts');
  await page.getByTestId('curator-payout-onboarding').click();
  await expect(card.getByRole('alert')).toBeVisible();
  // Onboarding auto-created the free profile; its editor is on the profile step.
  await openStudioStep(page, 'studio-profile');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

  await openStudioStep(page, 'studio-payouts');
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
  await openStudioStep(page, 'studio-payouts');
  await expect(card.getByRole('alert')).toBeVisible({ timeout: 10_000 });

  await openStudioStep(page, 'studio-profile');
  await page.getByLabel('Headline').fill('Free profile survives payout errors');
  await page.getByRole('button', { name: 'Create curator profile' }).click();

  await expect.poll(() => state.curatorProfile?.headline).toBe('Free profile survives payout errors');
  await expect(page.getByTestId('curator-pro-subscribe')).toBeEnabled();
});

test('creates a free draft with policy economics before Pro or payouts', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');

  const card = page.getByTestId('curator-plan-card');
  await expect(card.getByRole('heading', { name: 'Fan membership plan' })).toBeVisible();
  await expect(card.getByLabel('Monthly price (USD)')).toHaveValue('5.00');
  await card.getByLabel('Monthly price (USD)').fill('7');
  await card.getByLabel('Annual price (USD, optional)').fill('70');
  await expect(card.getByText('$7.58', { exact: true })).toBeVisible();
  await expect(card.getByText('$6.19', { exact: true })).toBeVisible();
  await expect(card.getByText('$73.10', { exact: true })).toBeVisible();
  await expect(card.getByText('$5.00/month, billed separately', { exact: true })).toBeVisible();

  await card.getByLabel('Plan name').fill('Selector Club');
  await card.getByLabel('Description').fill('Member-only selections.');
  await card.getByLabel(/Member-only posts/).check();
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft saved. Publishing remains optional.');
  await expect(card.getByTestId('curator-plan-draft')).toContainText('Selector Club');
  await expect(card.getByTestId('curator-plan-publish')).toBeDisabled();
  expect(state.curatorPlanCreateRequests).toEqual([{
    name: 'Selector Club',
    description: 'Member-only selections.',
    amountMinor: 700,
    annualAmountMinor: 7000,
    featureKeys: ['member_posts'],
  }]);
  await openStudioStep(page, 'studio-profile');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  await expect(page.getByTestId('curator-pro-subscribe')).toBeEnabled();
  await expect(page.getByTestId('curator-payout-onboarding')).toBeEnabled();
});

test('publishes after payout onboarding starts and archives without canceling subscriptions', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorProStatus: fixtureCuratorProActiveStatus,
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'restricted',
      transfersCapabilityStatus: 'restricted',
      requirementsDue: true,
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(STUDIO_PATH);
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Plan name').fill('Ready Plan');
  await card.getByLabel('Monthly price (USD)').fill('7');
  await card.getByRole('button', { name: 'Save draft' }).click();

  const publish = card.getByTestId('curator-plan-publish');
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(card.getByTestId('curator-plan-active')).toContainText('$7.58 (frozen)');
  expect(state.curatorPlanPublishRequests).toEqual(['mpl_FixtureStudioPlan01']);

  await card.getByRole('button', { name: 'Archive plan' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Existing subscriptions are not canceled');
  await dialog.getByRole('button', { name: 'Archive plan' }).click();

  await expect(card.getByTestId('curator-plan-archived')).toContainText('Ready Plan');
  await expect(card.getByTestId('curator-plan-notice')).toContainText('Existing subscriptions were not canceled.');
  expect(state.curatorPlanArchiveRequests).toEqual(['mpl_FixtureStudioPlan01']);
});

test('does not publish a suspended profile after a crafted Pro return', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile: {
      ...curatorProfile,
      status: 'suspended',
      suspensionReason: 'Payout account ownership requires review.',
    },
    curatorProStatus: fixtureCuratorProActiveStatus,
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'active',
      transfersCapabilityStatus: 'active',
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(`${STUDIO_PATH}?pro=return&session_id=untrusted`);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Plan name').fill('Suspended Plan');
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-publish')).toBeDisabled();
  expect(state.curatorPlanPublishRequests).toEqual([]);
});

test('uses server-provided curator-borne processing in the estimate', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPricing: curatorBornePricing,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Monthly price (USD)').fill('7');

  await expect(card.getByText('Payment processing').locator('..')).toContainText('−$0.55');
  await expect(card.getByText('Estimated curator accrual').locator('..')).toContainText('$5.75');
  await expect(card.getByText('$5.00/month, billed separately', { exact: true })).toBeVisible();
  await expect(card).toContainText(
    'monthly, after your balance reaches $10.00. Smaller cleared balances are paid after 90 days or when Curator Pro ends.',
  );
});

test('isolates plan-tool failures from profile, Pro, and payout controls', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlanToolsStatus: 503,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');

  await expect(page.getByTestId('curator-plan-card').getByRole('alert')).toContainText(
    'Your free profile, Curator Pro, and payout controls still work.',
    { timeout: 10_000 },
  );
  await openStudioStep(page, 'studio-profile');
  await page.getByLabel('Headline').fill('Free profile survives plan errors');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect.poll(() => state.curatorProfile?.headline).toBe('Free profile survives plan errors');
  await expect(page.getByTestId('curator-pro-subscribe')).toBeEnabled();
  await expect(page.getByTestId('curator-payout-onboarding')).toBeEnabled();
});

test('shows private paginated earnings without Curator Pro', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorEarnings: { activeMemberCount: 3, items: earningsItems },
  });
  const firstPageResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/curators/me/earnings' && url.searchParams.get('page') === '1';
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-earnings');

  const card = page.getByTestId('curator-earnings-card');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('curator-active-member-count')).toHaveText('3');
  await expect(page.getByTestId('curator-pro-subscribe')).toBeEnabled();

  const terminalAllocation = card.getByText('$1.25', { exact: true }).locator('..').locator('..');
  await expect(terminalAllocation).toContainText('Membership earning');
  await expect(terminalAllocation).toContainText('Not earned');
  await expect(terminalAllocation).not.toContainText('Payout eligibility');
  await expect(card.getByText('$4.25', { exact: true }).locator('..').locator('..')).toContainText(
    'Payout eligibility',
  );
  const transfer = card.getByText('$9.00', { exact: true }).locator('..').locator('..');
  await expect(transfer).toContainText('Payout transfer');
  await expect(transfer).toContainText('Paid');

  const responseText = JSON.stringify(await (await firstPageResponse).json());
  expect(responseText).not.toMatch(
    /sourceRef|stripe|failureDetail|reversalReason|fanUserId|membershipSubscriptionId/i,
  );

  await card.getByRole('button', { name: 'Next' }).click();
  await expect(card.getByText(/Page 2/)).toBeVisible();
  await expect(card.getByText('$2.07', { exact: true })).toBeVisible();
  expect(state.curatorEarningsRequests).toEqual([
    { page: 1, pageSize: 10 },
    { page: 2, pageSize: 10 },
  ]);
});
