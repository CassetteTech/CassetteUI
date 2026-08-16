import { expect, test, type Page } from '@playwright/test';
import type { InternalCurator, PricingPolicy } from '../src/services/internal-curators';
import {
  FIXTURE_TIMESTAMP,
  fixtureInternalPaidPromotionCampaign,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const activeCurator: InternalCurator = {
  id: 'cpr_FixtureCurator01',
  userId: '00000000-0000-4000-8000-000000000101',
  username: 'cratekeeper',
  status: 'active',
  headline: 'Daily playlists for every mood.',
  about: null,
  declaredGenres: ['Electronic'],
  declaredPlatforms: ['Spotify'],
  suspensionReason: null,
  createdAtUtc: FIXTURE_TIMESTAMP,
  statusChangedAtUtc: FIXTURE_TIMESTAMP,
};

const retiredCurator: InternalCurator = {
  ...activeCurator,
  id: 'cpr_FixtureRetired01',
  userId: '00000000-0000-4000-8000-000000000102',
  username: 'archivedselector',
  status: 'retired',
};

const defaultPolicy: PricingPolicy = {
  id: 'msf_FixturePolicy01',
  policyKey: 'launch_default',
  version: 1,
  displayName: 'Launch default',
  isActive: true,
  isDefault: true,
  defaultEffectiveAtUtc: FIXTURE_TIMESTAMP,
  curatorProMonthlyPriceMinor: 500,
  currency: 'USD',
  platformFeeBps: 1_000,
  serviceFeeBps: 0,
  serviceFeeFixedMinor: 0,
  processingBorneBy: 'platform',
  processingFeeBps: 360,
  processingFeeFixedMinor: 30,
  payoutOpsFeeBps: 0,
  payoutCadence: 'monthly',
  minPayoutMinor: 2_500,
  createdAtUtc: FIXTURE_TIMESTAMP,
};

const payoutExceptions = [
  {
    id: 'pmx_FixturePayoutTransfer01',
    kind: 'payout_transfer',
    paymentId: null,
    campaignId: null,
    status: 'open',
    createdAtUtc: FIXTURE_TIMESTAMP,
    resolvedAtUtc: null,
  },
  {
    id: 'pmx_FixturePayoutClawback01',
    kind: 'payout_clawback',
    paymentId: null,
    campaignId: null,
    status: 'open',
    createdAtUtc: FIXTURE_TIMESTAMP,
    resolvedAtUtc: null,
  },
];

const openCuratorsConsole = async (page: Page) => {
  const mocked = await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalCurators: [activeCurator, retiredCurator],
    internalPricingPolicies: [defaultPolicy],
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      exceptions: payoutExceptions,
    },
  });
  await page.goto('/internal/curators');
  await expect(page.getByRole('heading', { name: 'Curators', level: 1 })).toBeVisible();
  return mocked;
};

test('keeps the curator console team-only', async ({ page }) => {
  const internalRequests: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/v1/internal/')) internalRequests.push(pathname);
  });
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/internal/curators');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Curators', level: 1 })).toHaveCount(0);
  expect(internalRequests).toEqual([]);
});

test('suspends, reinstates, and keeps retired curators read-only', async ({ page }) => {
  const { state } = await openCuratorsConsole(page);
  const reason = 'Repeated payout-account ownership mismatch.';

  await expect(page.getByRole('list', { name: 'Open payout exceptions' }))
    .toContainText('payout transfer');
  await expect(page.getByRole('list', { name: 'Open payout exceptions' }))
    .toContainText('payout clawback');
  await expect(page.getByText('pmx_FixturePayoutTransfer01')).toBeVisible();
  await expect(page.getByText('pmx_FixturePayoutClawback01')).toBeVisible();

  await page.getByLabel('Suspension reason').fill(reason);
  await page.getByRole('button', { name: 'Suspend curator' }).click();
  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reinstate curator' })).toBeVisible();
  expect(state.internalCuratorSuspendRequests).toEqual([{
    curatorId: activeCurator.id,
    reason,
  }]);

  await page.getByRole('button', { name: 'Reinstate curator' }).click();
  await expect(page.getByRole('button', { name: 'Suspend curator' })).toBeVisible();
  expect(state.internalCuratorReinstateRequests).toEqual([activeCurator.id]);

  await page.getByRole('combobox', { name: 'Curator', exact: true })
    .selectOption(retiredCurator.id);
  await expect(page.getByText('Retired profiles are read-only.')).toBeVisible();
  await expect(page.getByText('Retired profiles cannot receive new assignments.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Suspend curator' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reinstate curator' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Assign policy' })).toHaveCount(0);
});

test('creates, defaults, assigns, and records an immutable pricing policy', async ({ page }) => {
  const { state } = await openCuratorsConsole(page);
  const reason = 'Use launch economics for future subscriptions.';

  await expect(page.getByText(/Existing Curator Pro subscriptions keep their agreed Stripe price/))
    .toBeVisible();
  await page.getByText('Create immutable policy version', { exact: true }).click();
  await page.getByLabel('Policy key').fill('curator_launch');
  await page.getByLabel('Display name').fill('Curator launch');
  await page.getByLabel('Curator Pro monthly price (USD)').fill('7.50');
  await page.getByLabel('Platform fee (%)').fill('12.50');
  await page.getByLabel('Fan service fee (%)').fill('2.25');
  await page.getByLabel('Fan fixed fee (USD)').fill('0.35');
  await page.getByLabel('Processing paid by').selectOption('platform');
  await page.getByLabel('Payout operations fee (%)').fill('0.75');
  await page.getByLabel('Payout cadence').selectOption('quarterly');
  await page.getByLabel('Minimum payout (USD)').fill('40.00');
  await page.getByRole('button', { name: 'Create policy version' }).click();

  const policies = page.getByRole('list', { name: 'Pricing policies' });
  const createdPolicy = policies.getByRole('listitem').filter({ hasText: 'Curator launch' });
  await expect(createdPolicy).toContainText('curator_launch v1');
  expect(state.internalPricingPolicyCreateRequests).toEqual([{
    policyKey: 'curator_launch',
    displayName: 'Curator launch',
    isActive: true,
    curatorProMonthlyPriceMinor: 750,
    currency: 'USD',
    platformFeeBps: 1_250,
    serviceFeeBps: 225,
    serviceFeeFixedMinor: 35,
    processingBorneBy: 'platform',
    payoutOpsFeeBps: 75,
    payoutCadence: 'quarterly',
    minPayoutMinor: 4_000,
  }]);

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('curator_launch v1');
    void dialog.accept();
  });
  await createdPolicy.getByRole('button', { name: 'Set as default' }).click();
  await expect(createdPolicy).toContainText('default');
  expect(state.internalPricingPolicyDefaultRequests).toEqual(['msf_FixturePolicy02']);

  await page.getByLabel('Pricing policy').selectOption({ label: 'Curator launch · curator_launch v1' });
  await page.getByLabel('Assignment reason').fill(reason);
  await page.getByRole('button', { name: 'Assign policy' }).click();
  const assignment = page.getByRole('row').filter({ hasText: reason });
  await expect(assignment).toContainText('Curator launch · v1');
  await expect(assignment).toContainText('@cassetteteam');
  expect(state.internalPricingAssignmentRequests).toEqual([{
    curatorProfileId: activeCurator.id,
    policyId: 'msf_FixturePolicy02',
    effectiveAtUtc: null,
    reason,
  }]);
});
