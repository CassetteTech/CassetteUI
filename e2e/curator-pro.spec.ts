import { expect, type Page, test } from '@playwright/test';

import type { CuratorProStatus } from '../src/services/curator-pro';
import {
  fixtureCuratorProActiveStatus,
  fixtureCuratorProDefaultStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const STUDIO_PATH = '/studio/curator';
const CHECKOUT_URL = 'https://checkout.stripe.test/curator-pro-session';
const PORTAL_URL = 'https://billing.stripe.test/curator-pro-session';

const proStatus = (overrides: Partial<CuratorProStatus>): CuratorProStatus => ({
  ...fixtureCuratorProDefaultStatus,
  ...overrides,
});

async function returnFromProvider(page: Page, providerUrl: string, returnPath: string) {
  const appOrigin = new URL(page.url()).origin;
  await page.route(providerUrl, (route) => route.fulfill({
    status: 302,
    headers: { location: `${appOrigin}${returnPath}` },
  }));
}

test('shows default economics without taking away the free profile editor', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatus: fixtureCuratorProDefaultStatus,
  });

  await page.goto(STUDIO_PATH);

  const card = page.getByTestId('curator-pro-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('$5.00');
  await expect(card).toContainText('10%');
  await expect(page.getByTestId('curator-pro-subscribe')).toHaveText('Start Curator Pro');
  await expect(page.getByRole('heading', { name: 'Your free curator profile' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create curator profile' })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(card).toBeVisible();
  await expect(page.getByLabel('Headline')).toBeVisible();
  const pageWidths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  ]);
  expect(Math.max(...pageWidths)).toBeLessThanOrEqual(375);
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
  await expect(card).toContainText('12.5%');

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
    curatorProStatus: fixtureCuratorProDefaultStatus,
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
    `${STUDIO_PATH}?pro=return&session_id=cs_secret_must_not_be_trusted`,
  );
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
  const card = page.getByTestId('curator-pro-card');
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(page.getByTestId('curator-pro-subscribe')).toHaveCount(0);
  await expect(card).toContainText('Payment needs attention.');

  state.curatorProStatus = {
    ...fixtureCuratorProActiveStatus,
    hasAccess: false,
  };
  await page.reload();
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
  await expect(page.getByTestId('curator-pro-manage')).toBeVisible();
  await expect(card).toContainText('Curator Pro is canceling on Sep 16, 2026.');

  state.curatorProStatus = proStatus({
    status: 'canceled',
    canManage: true,
  });
  await page.reload();
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
  await returnFromProvider(page, PORTAL_URL, `${STUDIO_PATH}?pro=portal-return`);
  await page.getByTestId('curator-pro-manage').click();

  await expect.poll(() => state.curatorProPortalRequests).toBe(1);
  await expect(page.getByTestId('curator-pro-notice')).toContainText(/end|cancel/i);

  state.curatorProStatusSequence.push(fixtureCuratorProActiveStatus);
  await page.getByTestId('curator-pro-manage').click();

  await expect.poll(() => state.curatorProPortalRequests).toBe(2);
  await expect(page.getByTestId('curator-pro-notice')).toContainText(/continue|active/i);
});

test('leaves the free profile editor usable when Pro status fails', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProStatusFailures: 10,
  });

  await page.goto(STUDIO_PATH);

  await expect(page.getByTestId('curator-pro-card').getByRole('alert')).toBeVisible({
    timeout: 10_000,
  });
  await page.getByLabel('Headline').fill('Free profile still works');
  await page.getByRole('button', { name: 'Create curator profile' }).click();

  await expect.poll(() => state.curatorProfile?.headline).toBe('Free profile still works');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
});
