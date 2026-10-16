import { expect, test } from '@playwright/test';

import type { CuratorProStatus } from '../src/services/curator-pro';
import {
  fixtureCuratorProActiveStatus,
  fixtureCuratorProAvailableStatus,
  fixtureCuratorProDefaultStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { expectNoHorizontalOverflow } from './support/layout';
import { mockCassetteApp } from './support/mock-cassette-app';
import { pauseAtReturnRead, returnFromProvider } from './support/provider-return';
import { openStudioStep } from './support/studio-steps';

const STUDIO_PATH = '/studio';
const STUDIO_PAYOUTS_PATH = '/studio/payouts';
const CHECKOUT_URL = 'https://checkout.stripe.test/curator-pro-session';
const PORTAL_URL = 'https://billing.stripe.test/curator-pro-session';
const PRO_STATUS_PATH = /^\/api\/v1\/curators\/pro\/status$/;

const proStatus = (overrides: Partial<CuratorProStatus>): CuratorProStatus => ({
  ...fixtureCuratorProAvailableStatus,
  ...overrides,
});

test('shows default economics without taking away Studio Music', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProAvailableStatus,
  });

  await page.goto(STUDIO_PATH);

  await expect(page.getByRole('heading', { name: 'Music', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add your first music' })).toBeVisible();
  await openStudioStep(page, 'studio-pro');
  const card = page.getByTestId('curator-pro-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('$5.00');
  await expect(page.getByTestId('curator-pro-subscribe')).toHaveText('Start Curator Pro');

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(card).toBeVisible();
  await openStudioStep(page, 'studio-music');
  await expect(page.getByRole('heading', { name: 'Music', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('renders policy pricing and each valid launch discount', async ({ page }) => {
  const dynamicStatus = proStatus({
    monthlyPriceMinor: 725,
    platformFeeBps: 1_250,
  });
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: dynamicStatus,
  });

  await page.goto(STUDIO_PATH);
  const card = page.getByTestId('curator-pro-card');
  await expect(card).toContainText('$7.25');

  state.curatorProStatus = {
    ...fixtureCuratorProActiveStatus,
    discountKind: 'temporary',
    discountEndsAtUtc: '2026-09-16T12:00:00Z',
  };
  await page.reload();
  await expect(card).toContainText('$0.00');
  await expect(card).toContainText(/free|discount/i);
  await expect(card).toContainText(/Sep 16, 2026/);

  state.curatorProStatus = {
    ...fixtureCuratorProActiveStatus,
    discountKind: 'forever',
  };
  await page.reload();
  await expect(card).toContainText('$0.00');
  await expect(card).toContainText(/forever/i);
});

test('waits for polled subscription truth after Checkout returns', async ({ page }) => {
  const incompleteStatus = proStatus({
    canSubscribe: false,
    status: 'incomplete',
  });
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProAvailableStatus,
    curatorProStatusSequence: [
      incompleteStatus,
      incompleteStatus,
      fixtureCuratorProActiveStatus,
    ],
  });

  await page.goto(STUDIO_PATH);
  await returnFromProvider(
    page,
    CHECKOUT_URL,
    `${STUDIO_PAYOUTS_PATH}?pro=return&session_id=cs_secret_must_not_be_trusted`,
  );
  await openStudioStep(page, 'studio-pro');
  await page.getByTestId('curator-pro-subscribe').click();

  expect(state.curatorProStatus.hasAccess).toBe(false);
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect.poll(() => state.curatorProStatusRequests).toBeGreaterThanOrEqual(4);
  expect(state.curatorProStatus.hasAccess).toBe(true);
  await expect(page).not.toHaveURL(/session_id=/);
});

test('keeps billing management available across non-active lifecycle states', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: proStatus({
      canSubscribe: false,
      status: 'past_due',
      canManage: true,
    }),
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-pro');
  const card = page.getByTestId('curator-pro-card');
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(page.getByTestId('curator-pro-subscribe')).toHaveCount(0);
  await expect(card).toContainText('Payment needs attention.');

  state.curatorProStatus = {
    ...fixtureCuratorProActiveStatus,
    hasAccess: false,
  };
  await page.reload();
  await openStudioStep(page, 'studio-pro');
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(card).toContainText('Access unavailable');
  await expect(card).toContainText('subscription is current, but access is unavailable.');

  state.curatorProStatus = proStatus({
    hasAccess: true,
    canSubscribe: false,
    status: 'active',
    canManage: true,
    cancelAtPeriodEnd: true,
    paidThroughUtc: '2026-09-16T12:00:00Z',
  });
  await page.reload();
  await openStudioStep(page, 'studio-pro');
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(card).toContainText('Curator Pro is canceling on Sep 16, 2026.');

  state.curatorProStatus = proStatus({
    status: 'canceled',
    canManage: true,
  });
  await page.reload();
  await openStudioStep(page, 'studio-pro');
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(page.getByTestId('curator-pro-subscribe')).toHaveText('Restart Curator Pro');
  await expect(card).toContainText('Curator Pro is canceled.');
});

test('reflects cancellation and reactivation only after Billing Portal mirror changes', async ({ page }) => {
  const cancelingStatus = {
    ...fixtureCuratorProActiveStatus,
    cancelAtPeriodEnd: true,
  };
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProActiveStatus,
    curatorProStatusSequence: [cancelingStatus],
  });

  await page.goto(STUDIO_PATH);
  await returnFromProvider(page, PORTAL_URL, `${STUDIO_PAYOUTS_PATH}?pro=portal-return`);
  await openStudioStep(page, 'studio-pro');
  await page.getByTestId('curator-pro-manage').click();

  await expect.poll(() => state.curatorProPortalRequests).toBe(1);
  await expect(page.getByTestId('curator-pro-notice')).toContainText(/end|cancel/i);

  state.curatorProStatusSequence.push(fixtureCuratorProActiveStatus);
  await page.getByTestId('curator-pro-manage').click();

  await expect.poll(() => state.curatorProPortalRequests).toBe(2);
  await expect(page.getByTestId('curator-pro-notice')).toContainText(/continue|active/i);
});

test('ends an unchanged Billing Portal return with neutral copy and a way to check again', async ({ page }) => {
  await page.clock.install();
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProActiveStatus,
  });

  await page.goto(STUDIO_PATH);
  const returnPath = `${STUDIO_PAYOUTS_PATH}?pro=portal-return`;
  await returnFromProvider(page, PORTAL_URL, returnPath);
  await openStudioStep(page, 'studio-pro');
  const card = page.getByTestId('curator-pro-card');
  await expect(card).toContainText('Your memberships and earnings are not affected.');
  await pauseAtReturnRead(page, returnPath, PRO_STATUS_PATH, () => page.getByTestId('curator-pro-manage').click());
  const requestsAtPause = state.curatorProStatusRequests;
  await page.clock.runFor(1_000);
  await expect.poll(() => state.curatorProStatusRequests).toBe(requestsAtPause + 1);
  await page.clock.fastForward('00:30');

  await expect(page.getByTestId('curator-pro-notice')).toHaveText(
    'No billing change has reached Cassette yet. A change made in Stripe can take a minute to appear.',
  );
  await expect(page).not.toHaveURL(/pro=/);
  await expect(page.getByText(/up to date|unchanged/)).toHaveCount(0);
  const requestsAtTimeout = state.curatorProStatusRequests;
  await page.clock.runFor(5_000);
  await page.waitForTimeout(300);
  expect(state.curatorProStatusRequests).toBe(requestsAtTimeout);
  await page.getByRole('button', { name: 'Check again' }).click();
  await page.clock.runFor(1_000);
  await expect.poll(() => state.curatorProStatusRequests).toBeGreaterThan(requestsAtTimeout);
});

test('shows a Billing Portal cancellation that reaches Bridge after the first status read', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProActiveStatus,
    curatorProStatusSequence: [
      fixtureCuratorProActiveStatus,
      fixtureCuratorProActiveStatus,
      { ...fixtureCuratorProActiveStatus, cancelAtPeriodEnd: true },
    ],
  });

  await page.goto(STUDIO_PATH);
  await returnFromProvider(page, PORTAL_URL, `${STUDIO_PAYOUTS_PATH}?pro=portal-return`);
  await openStudioStep(page, 'studio-pro');
  await page.getByTestId('curator-pro-manage').click();

  await expect(page.getByTestId('curator-pro-notice')).toContainText('Curator Pro will end');
  await expect(page.getByText(/up to date|unchanged/)).toHaveCount(0);
});

test('keeps Curator Pro hidden and the membership setup usable when Pro status fails', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatusFailures: 10,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-pro');

  await expect(page.getByTestId('curator-payout-card')).toBeVisible();
  await expect(page.getByTestId('curator-pro-card')).toHaveCount(0);
  await openStudioStep(page, 'studio-membership');
  await page.getByRole('button', { name: 'Next: Design your membership' }).click();

  await expect(page.getByTestId('curator-plan-card').getByLabel('Plan name')).toBeFocused();
});

test('hides Curator Pro everywhere in Studio while it is not available', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProDefaultStatus,
  });

  await page.goto(STUDIO_PATH);
  await expect(page.getByRole('heading', { name: 'Music', exact: true })).toBeVisible();
  await expect(page.getByText(/Curator Pro/)).toHaveCount(0);

  await openStudioStep(page, 'studio-pro');
  await expect(page.getByTestId('curator-payout-card')).toBeVisible();
  await expect(page.getByTestId('curator-pro-card')).toHaveCount(0);
  await expect(page.getByText(/Curator Pro/)).toHaveCount(0);
});

test('keeps billing management for an existing subscriber while Curator Pro is not available', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: { ...fixtureCuratorProActiveStatus, available: false },
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-pro');

  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(page.getByTestId('curator-pro-subscribe')).toHaveCount(0);
});
