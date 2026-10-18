import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  CURATOR_SUBSCRIBER_SENTINEL,
  fixtureActiveMembershipStatus,
  fixtureCanceledMembershipStatus,
  fixtureCancelingMembershipStatus,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureIncompleteMembershipStatus,
  fixtureMemberCuratorPage,
  fixtureNoMembershipStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { pauseAtReturnRead, returnFromProvider } from './support/provider-return';

const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const CHECKOUT_URL = 'https://checkout.stripe.test/membership-session';
const PORTAL_URL = 'https://billing.stripe.test/membership-session';
const MEMBERSHIP_STATUS_PATH = /^\/api\/v1\/memberships\/status\//;

const joinControl = (page: Page) => page.getByTestId('membership-join');

const intervalControl = (card: Locator, interval: 'month' | 'year') =>
  card.getByText(interval === 'month' ? 'Monthly' : 'Annual', { exact: true });

const manageControl = (page: Page) => page.getByTestId('membership-manage');

const unpaidMembershipStatus = {
  ...fixtureActiveMembershipStatus,
  membership: { ...fixtureActiveMembershipStatus.membership!, status: 'unpaid' as const },
};

async function expectRepairedMembership(page: Page, state: { membershipStatusRequests: string[] }) {
  await expect(page.getByTestId('membership-view-posts')).toBeVisible();
  await expect(page.getByTestId('curator-locked-post')).toHaveCount(0);
  await expect(page.getByTestId('membership-standing')).toHaveCount(0);
  await expect(page.getByTestId('membership-notice')).toHaveCount(0);
  await expect(page).not.toHaveURL(/membership=/);
  const requests = state.membershipStatusRequests.length;
  await page.clock.runFor(5_000);
  await page.waitForTimeout(300);
  expect(state.membershipStatusRequests.length).toBe(requests);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-24T12:00:00Z') });
});
type MembershipAnalyticsProperties = {
  curator_id?: string;
  membership_plan_id?: string;
  post_id?: string;
  is_member_view?: boolean;
  billing_interval?: string;
  device_category?: string;
  user_cohort?: string;
};
type MembershipAnalyticsCapture = {
  [key: string]: string | MembershipAnalyticsProperties | undefined;
  event?: string;
  properties?: MembershipAnalyticsProperties;
};
const forbiddenMembershipAnalyticsFields = [
  'amount_minor',
  'billing_status',
  'checkout_url',
  'face_amount_minor',
  'name',
  'promotion_code',
  'service_fee_minor',
  'status',
  'total_amount_minor',
  'url',
];

async function expectMembershipEvent(
  captures: MembershipAnalyticsCapture[],
  event: string,
  isMemberView: boolean,
) {
  const findProperties = () => captures.find((capture) => capture.event === event)?.properties;
  await expect.poll(findProperties).toBeTruthy();
  const properties = findProperties();
  if (!properties) throw new Error(`Missing ${event} analytics capture`);
  expect(properties).toMatchObject({
    curator_id: fixtureCuratorPage.curator.id,
    membership_plan_id: fixtureCuratorPage.membership!.planId,
    is_member_view: isMemberView,
  });
  for (const field of forbiddenMembershipAnalyticsFields) {
    expect(properties).not.toHaveProperty(field);
  }
}

function trackSessionReads(page: Page) {
  const reads: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/session') reads.push(request.url());
  });
  return reads;
}

for (const price of [
  { interval: 'month' as const, total: '$5.50' },
  { interval: 'year' as const, total: '$55.00' },
]) {
  test(`shows the fee-inclusive ${price.interval} price and sends only the selected interval`, async ({ page }) => {
    const captures: MembershipAnalyticsCapture[] = [];
    const { state } = await mockCassetteApp(page, {
      analyticsCaptures: captures,
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });

    await page.goto(CURATOR_PATH);
    await returnFromProvider(page, CHECKOUT_URL, `${CURATOR_PATH}?membership=canceled`);

    const card = page.getByTestId('curator-membership-card');
    await intervalControl(card, price.interval).click();
    await expect(card).toContainText(`${price.total}/${price.interval}`);
    await joinControl(page).click();

    await expect.poll(() => state.membershipCheckoutRequests.at(-1)).toEqual({
      planId: fixtureCuratorPage.membership!.planId,
      interval: price.interval,
    });
    await expectMembershipEvent(captures, 'curator_page_viewed', false);
    await expectMembershipEvent(captures, 'membership_join_clicked', false);
    await expectMembershipEvent(captures, 'membership_checkout_started', false);
    const checkoutStarted = captures.find((capture) => capture.event === 'membership_checkout_started');
    expect(checkoutStarted?.properties?.billing_interval).toBe(price.interval);
    expect(['mobile', 'desktop']).toContain(checkoutStarted?.properties?.device_category);
    expect(['new', 'existing']).toContain(checkoutStarted?.properties?.user_cohort);
    await expect(page.getByTestId('membership-notice')).toHaveText(
      'Checkout was canceled. You were not charged.',
    );
    await expect(joinControl(page)).toHaveText('Retry Checkout');
    await joinControl(page).click();
    await expect.poll(() => state.membershipCheckoutRequests).toHaveLength(2);
  });
}

test('unlocks subscriber content only after the polled membership becomes active', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  const { state } = await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
    membershipPollSequence: [fixtureActiveMembershipStatus],
    membershipActiveCuratorPage: fixtureMemberCuratorPage,
  });
  const sessionReads = trackSessionReads(page);

  await page.goto(CURATOR_PATH);
  await returnFromProvider(
    page,
    CHECKOUT_URL,
    `${CURATOR_PATH}?membership=return&session_id=cs_secret_must_not_be_trusted`,
  );

  expect(await page.content()).not.toContain(CURATOR_SUBSCRIBER_SENTINEL);
  await joinControl(page).click();

  await expect(
    page.locator('h3:visible').filter({ hasText: CURATOR_SUBSCRIBER_SENTINEL }).first(),
  ).toBeVisible();
  await expect.poll(() => state.membershipStatusRequests.length).toBeGreaterThanOrEqual(2);
  await expect(page).not.toHaveURL(/session_id=/);
  await expect(page.getByTestId('membership-notice')).toHaveText('Your membership is active.');
  await expect.poll(() => sessionReads.length).toBe(3);
  await page.getByTestId('membership-view-posts').click();
  await expect(page.getByRole('radio', { name: 'Members only' })).toBeChecked();
  await expect(page.locator('[data-testid="profile-music"] h3:visible')).toHaveCount(1);
  await expect(page.getByTestId('membership-billing')).toContainText('$5.50/month');
  await expect(
    page.getByTestId('curator-membership-card').getByRole('link', { name: 'Memberships' }),
  ).toBeVisible();
  expect(captures.some((capture) => capture.event === 'membership_started')).toBe(false);
});

test('opens the owned Billing Portal membership and trusts its cancellation webhook state', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  const { state } = await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    membershipPollSequence: [fixtureCancelingMembershipStatus],
  });
  const sessionReads = trackSessionReads(page);

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expect.poll(() => state.membershipPortalRequests.at(-1)).toEqual({
    membershipSubscriptionId:
      fixtureActiveMembershipStatus.membership!.membershipSubscriptionId,
  });
  await expect(page.getByTestId('membership-standing')).toContainText(
    'Your membership will end on Sep 16, 2026.',
  );
  await expect(page.getByText('Member', { exact: true }).first()).toBeVisible();
  await expectMembershipEvent(captures, 'membership_canceled', true);
  await expect.poll(() => sessionReads.length).toBe(3);
});

test('keeps manage available but never offers Join when the curator has no published plan', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureFreeCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
  });

  await page.goto(CURATOR_PATH);
  await page.route(PORTAL_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<p>Fixture Billing Portal</p>',
  }));

  await expect(joinControl(page)).toHaveCount(0);
  await expect(page.getByText('Member', { exact: true })).toHaveCount(0);
  await manageControl(page).click();
  await expect.poll(() => state.membershipPortalRequests).toHaveLength(1);
  expect(state.membershipCheckoutRequests).toHaveLength(0);
});

test('blocks a new membership when the curator has no published plan', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureFreeCuratorPage,
    membershipStatus: { ...fixtureNoMembershipStatus, canSubscribe: false },
  });

  await page.goto(CURATOR_PATH);

  await expect(joinControl(page)).toHaveCount(0);
  expect(state.membershipCheckoutRequests).toHaveLength(0);
});

test('renders scheduled cancellation from status on an ordinary visit', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureCancelingMembershipStatus,
  });

  await page.goto(CURATOR_PATH);

  await expect(page.getByTestId('membership-standing')).toContainText(
    'Your membership will end on Sep 16, 2026.',
  );
  await expect(page.getByTestId('membership-notice')).toHaveCount(0);
  await expect(page.getByTestId('membership-billing')).toHaveText('$5.50/month · ends Sep 16, 2026');
});

test('reports a continued membership from one fresh status read after Portal reactivation', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureCancelingMembershipStatus,
    membershipPollSequence: [fixtureActiveMembershipStatus],
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expect(page.getByTestId('membership-notice')).toHaveText(
    'Your membership will continue.',
  );
  await expect.poll(() => state.membershipStatusRequests.length).toBeGreaterThanOrEqual(2);
});

test('does not attribute an unchanged canceled membership to a new Portal action', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  const { state } = await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureCanceledMembershipStatus,
    membershipPollSequence: [fixtureCanceledMembershipStatus],
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expect.poll(() => state.membershipStatusRequests.length).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('membership-notice')).toHaveCount(0);
  expect(captures.some((capture) => capture.event === 'membership_canceled')).toBe(false);
});

test('shows a Portal cancellation that reaches Bridge after the first status read', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    membershipPollSequence: [
      fixtureActiveMembershipStatus,
      fixtureActiveMembershipStatus,
      fixtureCancelingMembershipStatus,
    ],
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expect(page.getByTestId('membership-standing')).toContainText('Your membership will end on Sep 16, 2026.');
  await expect(page.getByTestId('membership-billing')).toHaveText('$5.50/month · ends Sep 16, 2026');
  await expect(page.getByText(/up to date/)).toHaveCount(0);
  await expectMembershipEvent(captures, 'membership_canceled', true);
});

test('does not attribute a crafted return URL to a new membership', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
  });

  await page.goto(`${CURATOR_PATH}?membership=return`);

  await expect(page.getByTestId('membership-notice')).toHaveText('Your membership is active.');
  expect(captures.some((capture) =>
    capture.event === 'membership_started' || capture.event === 'membership_checkout_started',
  )).toBe(false);
});

test('a return URL alone does not read the session again', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureIncompleteMembershipStatus,
  });
  const sessionReads = trackSessionReads(page);

  await page.goto(`${CURATOR_PATH}?membership=return`);
  await expect(joinControl(page)).toBeVisible();
  await page.clock.runFor(5_000);
  await page.waitForTimeout(300);
  expect(sessionReads).toHaveLength(1);
});

test('ends an unchanged Portal return with neutral copy and a way to check again', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    membershipPollSequence: [fixtureActiveMembershipStatus],
  });

  await page.goto(CURATOR_PATH);
  const returnPath = `${CURATOR_PATH}?membership=portal-return`;
  await returnFromProvider(page, PORTAL_URL, returnPath);
  await pauseAtReturnRead(page, returnPath, MEMBERSHIP_STATUS_PATH, () => manageControl(page).click());
  const requestsAtPause = state.membershipStatusRequests.length;
  await page.clock.runFor(1_000);
  await expect.poll(() => state.membershipStatusRequests.length).toBe(requestsAtPause + 1);
  await page.clock.fastForward('00:30');

  await expect(page.getByTestId('membership-notice')).toHaveText(
    'No membership change has reached Cassette yet. A change made in Stripe can take a minute to appear.',
  );
  await expect(page).not.toHaveURL(/membership=/);
  const requestsAtTimeout = state.membershipStatusRequests.length;
  await page.clock.runFor(5_000);
  await page.waitForTimeout(300);
  expect(state.membershipStatusRequests.length).toBe(requestsAtTimeout);

  await page.getByRole('button', { name: 'Check again' }).click();
  await page.clock.runFor(1_000);
  await expect.poll(() => state.membershipStatusRequests.length).toBeGreaterThan(requestsAtTimeout);
  await expect(page.getByText(/up to date/)).toHaveCount(0);
});

test('unlocks member posts when a Portal payment repair reaches Bridge after the first read', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  const { state } = await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureCuratorPage,
    membershipStatus: unpaidMembershipStatus,
    membershipPollSequence: [unpaidMembershipStatus, unpaidMembershipStatus, fixtureActiveMembershipStatus],
    membershipActiveCuratorPage: fixtureMemberCuratorPage,
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await expect(page.getByTestId('curator-locked-post')).not.toHaveCount(0);
  await manageControl(page).click();
  await page.waitForURL(/membership=portal-return/);
  await expect(page.getByTestId('membership-standing')).toContainText('on hold');
  await page.evaluate(() => { Object.defineProperty(window, 'portalReturnDocument', { value: true }); });
  expect(page.url()).toContain('membership=portal-return');

  await expectRepairedMembership(page, state);
  expect(await page.evaluate(() => 'portalReturnDocument' in window)).toBe(true);
  expect(captures.some((capture) => capture.event === 'membership_canceled')).toBe(false);
});

test('unlocks member posts after a wallet Portal repair that Bridge saw before the first read', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureCuratorPage,
    membershipStatus: unpaidMembershipStatus,
    membershipPollSequence: [fixtureActiveMembershipStatus],
    membershipActiveCuratorPage: fixtureMemberCuratorPage,
    myMemberships: [{
      curatorProfileId: fixtureCuratorPage.curator.id,
      curatorUsername: fixtureCuratorPage.curator.username,
      curatorDisplayName: fixtureCuratorPage.curator.displayName ?? '',
      membership: unpaidMembershipStatus.membership,
    }],
  });

  await page.goto('/memberships');
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await page.getByTestId('my-membership-manage').click();

  await expect(page).toHaveURL(new RegExp(CURATOR_PATH));
  await expectRepairedMembership(page, state);
});

test('detects a Portal repair when session storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage is disabled.', 'SecurityError');
      },
    });
  });
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureCuratorPage,
    membershipStatus: unpaidMembershipStatus,
    membershipPollSequence: [unpaidMembershipStatus, unpaidMembershipStatus, fixtureActiveMembershipStatus],
    membershipActiveCuratorPage: fixtureMemberCuratorPage,
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expectRepairedMembership(page, state);
});

test('shows a cancellation seen without a Portal baseline but does not attribute it', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  const { state } = await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
  });

  await page.goto(`${CURATOR_PATH}?membership=portal-return`);
  await expect.poll(() => state.membershipStatusRequests.length).toBeGreaterThanOrEqual(2);
  state.membershipStatus = structuredClone(fixtureCancelingMembershipStatus);

  await expect(page.getByTestId('membership-standing')).toContainText('Your membership will end on Sep 16, 2026.');
  await expect(page).not.toHaveURL(/membership=/);
  await page.clock.runFor(5_000);
  await page.waitForTimeout(300);
  expect(captures.some((capture) => capture.event === 'membership_canceled')).toBe(false);
});

test('guides a past-due member to update payment while access continues', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: {
      ...fixtureActiveMembershipStatus,
      membership: { ...fixtureActiveMembershipStatus.membership!, status: 'past_due' },
    },
  });

  await page.goto(CURATOR_PATH);
  await page.route(PORTAL_URL, (route) => route.fulfill({ status: 200, body: '' }));

  await expect(page.getByTestId('membership-standing')).toContainText('Update your payment method');
  await expect(manageControl(page)).toHaveText('Update payment method');
  await manageControl(page).click();
  await expect.poll(() => state.membershipPortalRequests).toHaveLength(1);
});

test('keeps a retained member on an archived plan in control without a public offer', async ({ page }) => {
  const archivedPlanPage = { ...fixtureMemberCuratorPage, membership: null };
  const retainedStatus = {
    ...fixtureActiveMembershipStatus,
    membership: {
      ...fixtureActiveMembershipStatus.membership!,
      planId: 'mpl_FixtureArchivedPlan01',
      faceAmountMinor: 300,
      serviceFeeMinor: 30,
      totalAmountMinor: 330,
    },
  };
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: archivedPlanPage,
    membershipStatus: retainedStatus,
  });

  await page.goto(CURATOR_PATH);

  await expect(
    page.locator('h3:visible').filter({ hasText: CURATOR_SUBSCRIBER_SENTINEL }).first(),
  ).toBeVisible();
  await expect(page.getByText('Member', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('membership-billing')).toContainText('$3.30/month');
  await expect(manageControl(page)).toBeVisible();
  await expect(joinControl(page)).toHaveCount(0);
});

test('lists the fan’s own memberships at their retained prices', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    myMemberships: [
      {
        curatorProfileId: fixtureCuratorPage.curator.id,
        curatorUsername: fixtureCuratorPage.curator.username,
        curatorDisplayName: fixtureCuratorPage.curator.displayName ?? '',
        membership: fixtureActiveMembershipStatus.membership!,
      },
      {
        curatorProfileId: 'cpr_FixtureCurator02',
        curatorUsername: 'second_curator',
        curatorDisplayName: 'Second Curator',
        membership: {
          ...fixtureCancelingMembershipStatus.membership!,
          membershipSubscriptionId: 'msb_FixtureMembership02',
          planId: 'mpl_FixtureArchivedPlan01',
          billingInterval: 'year',
          faceAmountMinor: 3000,
          serviceFeeMinor: 300,
          totalAmountMinor: 3300,
        },
      },
    ],
  });

  await page.goto('/memberships');
  await page.route(PORTAL_URL, (route) => route.fulfill({ status: 200, body: '' }));

  const rows = page.getByTestId('my-membership');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByTestId('my-membership-billing')).toHaveText(
    '$5.50/month · renews Sep 16, 2026 · tax extra',
  );
  await expect(rows.nth(1).getByTestId('my-membership-billing')).toHaveText('$33.00/year · ends Sep 16, 2026');
  await expect(rows.nth(1).getByRole('link', { name: 'Second Curator' })).toHaveAttribute(
    'href',
    '/profile/second_curator',
  );
  await expect(rows.nth(1).getByTestId('my-membership-manage')).toBeHidden();
  await rows.nth(1).locator('summary').click();
  await rows.nth(1).getByTestId('my-membership-manage').click();
  await expect.poll(() => state.membershipPortalRequests.at(-1)).toEqual({
    membershipSubscriptionId: 'msb_FixtureMembership02',
  });
});

test('explains curator-side endings with the access end date and refund state', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    myMemberships: [
      {
        curatorProfileId: fixtureCuratorPage.curator.id,
        curatorUsername: fixtureCuratorPage.curator.username,
        curatorDisplayName: fixtureCuratorPage.curator.displayName ?? '',
        membership: {
          ...fixtureCancelingMembershipStatus.membership!,
          endReason: 'plan_archived',
          accessEndsAtUtc: fixtureCancelingMembershipStatus.membership!.paidThroughUtc,
        },
      },
      {
        curatorProfileId: 'cpr_FixtureCurator02',
        curatorUsername: 'second_curator',
        curatorDisplayName: 'Second Curator',
        membership: {
          ...fixtureCanceledMembershipStatus.membership!,
          membershipSubscriptionId: 'msb_FixtureMembership02',
          canManage: false,
          endReason: 'curator_suspended',
          accessEndsAtUtc: '2026-08-20T00:00:00Z',
          refundStatus: 'refunded',
        },
      },
    ],
  });

  await page.goto('/memberships');
  const rows = page.getByTestId('my-membership');
  await expect(rows.nth(0).getByTestId('my-membership-standing')).toHaveText(
    'This curator stopped offering this membership. It ends on Sep 16, 2026, and you keep member access until then.',
  );
  await expect(rows.nth(1).getByTestId('my-membership-standing')).toHaveText(
    'This membership ended on Aug 20, 2026 because the curator can no longer offer it. Your unused paid time was refunded.',
  );
  await expect(rows.nth(1)).toContainText('Aug 20, 2026');
  await expect(rows.nth(1)).not.toContainText('suspend');
});

test('reads an immediate ending as ended while Stripe still reports the membership active', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    myMemberships: [
      {
        curatorProfileId: fixtureCuratorPage.curator.id,
        curatorUsername: fixtureCuratorPage.curator.username,
        curatorDisplayName: fixtureCuratorPage.curator.displayName ?? '',
        membership: {
          ...fixtureActiveMembershipStatus.membership!,
          endReason: 'curator_suspended',
          accessEndsAtUtc: '2026-08-20T00:00:00Z',
          refundStatus: 'pending',
        },
      },
    ],
  });

  await page.goto('/memberships');
  const pass = page.getByTestId('my-membership');
  await expect(pass.getByTestId('my-membership-standing')).toHaveText(
    'This membership ended on Aug 20, 2026 because the curator can no longer offer it. A refund for your unused paid time is on its way.',
  );
  await expect(pass.getByTestId('my-membership-billing')).toHaveText('$5.50/month · ended Aug 20, 2026');
  await expect(pass).toContainText('Ended');
  await expect(pass).not.toContainText(/renews/i);
  await expect(page.getByText(/active of 1/)).toContainText('0 active of 1');
});

test('keeps payment and pause guidance on passes with a future end date', async ({ page }) => {
  const ending = fixtureCancelingMembershipStatus.membership!;
  const entry = (index: number, status: 'past_due' | 'unpaid' | 'paused') => ({
    curatorProfileId: `cpr_FixtureCurator0${index}`,
    curatorUsername: `curator_${index}`,
    curatorDisplayName: `Curator ${index}`,
    membership: {
      ...ending,
      membershipSubscriptionId: `msb_FixtureMembership0${index}`,
      status,
      accessEndsAtUtc: ending.paidThroughUtc,
    },
  });
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    myMemberships: [entry(1, 'past_due'), entry(2, 'unpaid'), entry(3, 'paused')],
  });

  await page.goto('/memberships');
  const rows = page.getByTestId('my-membership');
  const expected = [
    {
      tier: 'Payment needed',
      action: 'Update payment method',
      standing: 'Your membership will end on Sep 16, 2026. Your last payment failed. Update your payment method in billing settings to keep access.',
    },
    {
      tier: 'Payment needed',
      action: 'Update payment method',
      standing: 'Your membership will end on Sep 16, 2026. Your membership is on hold because payment failed. Update your payment method in billing settings to restore access.',
    },
    {
      tier: 'Paused',
      action: 'Manage membership',
      standing: 'Your membership will end on Sep 16, 2026. Your membership is paused. Resume it from billing settings to restore access.',
    },
  ];
  for (const [index, row] of expected.entries()) {
    const pass = rows.nth(index);
    await expect(pass.getByTestId('my-membership-standing')).toHaveText(row.standing);
    await expect(pass).toContainText(row.tier);
    await expect(pass).toContainText('Ends');
    await expect(pass).not.toContainText(/Renews|keep member access/);
    if (row.action === 'Manage membership') await pass.locator('summary').click();
    await expect(pass.getByTestId('my-membership-manage')).toHaveText(row.action);
  }
  await expect(page.getByText(/active of 3/)).toContainText('1 active of 3');
});

test('keeps payment guidance on the profile pass before a scheduled end', async ({ page }) => {
  const ending = fixtureCancelingMembershipStatus.membership!;
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: {
      ...fixtureCancelingMembershipStatus,
      membership: { ...ending, status: 'past_due', accessEndsAtUtc: ending.paidThroughUtc },
    },
  });

  await page.goto(CURATOR_PATH);

  const card = page.getByTestId('curator-membership-card');
  await expect(page.getByTestId('membership-standing')).toHaveText(
    'Your membership will end on Sep 16, 2026. Your last payment failed. Update your payment method in billing settings to keep access.',
  );
  await expect(page.getByTestId('membership-billing')).toHaveText(
    '$5.50/month · payment overdue · ends Sep 16, 2026 · tax extra',
  );
  await expect(card).toContainText('Ends');
  await expect(card).not.toContainText('Renews');
  await expect(manageControl(page)).toHaveText('Update payment method');
});

test('slides a membership pass into the curator profile rail on navigation', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    reducedMotion: 'no-preference',
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    myMemberships: [
      {
        curatorProfileId: fixtureCuratorPage.curator.id,
        curatorUsername: fixtureCuratorPage.curator.username,
        curatorDisplayName: fixtureCuratorPage.curator.displayName ?? '',
        membership: fixtureActiveMembershipStatus.membership!,
      },
    ],
  });
  await page.goto('/memberships');
  await page.getByTestId('my-membership').getByRole('link').click();

  const pass = page.getByTestId('curator-membership-card');
  await expect(pass).toBeVisible();
  await expect
    .poll(() => pass.evaluate((node) => node.getAnimations().some((animation) => animation.playState === 'running')))
    .toBe(true);
});

test('shows an empty state when the fan has no memberships', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });
  await page.goto('/memberships');
  await expect(page.getByTestId('my-memberships-empty')).toBeVisible();
});

test('shows a retryable error when memberships cannot load', async ({ page }) => {
  const { state } = await mockCassetteApp(page, { currentUser: fixtureUsers.member, myMembershipsStatus: 503 });
  await page.goto('/memberships');
  await expect(page.getByRole('heading', { name: 'Could not load memberships' })).toBeVisible();
  state.myMembershipsStatus = 200;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('my-memberships-empty')).toBeVisible();
});

test('does not display a replacement plan as an existing membership price', async ({ page }) => {
  const replacementPage = {
    ...fixtureMemberCuratorPage,
    membership: {
      ...fixtureMemberCuratorPage.membership!,
      planId: 'mpl_FixtureMembership02',
      name: 'Replacement plan',
      amountMinor: 900,
      serviceFeeMinor: 90,
    },
  };
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: replacementPage,
    membershipStatus: fixtureActiveMembershipStatus,
  });

  await page.goto(CURATOR_PATH);

  const card = page.getByTestId('curator-membership-card');
  await expect(card).not.toContainText('Replacement plan');
  await expect(card).not.toContainText('$9.90');
  await expect(manageControl(page)).toBeVisible();
});

test('retries a rotated incomplete annual membership on the current monthly offer', async ({ page }) => {
  const currentPlan = {
    ...fixtureCuratorPage,
    membership: {
      ...fixtureCuratorPage.membership!,
      planId: 'mpl_FixtureMembership02',
      annualAmountMinor: null,
      annualServiceFeeMinor: null,
    },
  };
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: currentPlan,
    membershipStatus: {
      ...fixtureIncompleteMembershipStatus,
      membership: {
        ...fixtureIncompleteMembershipStatus.membership!,
        billingInterval: 'year',
      },
    },
  });

  await page.goto(`${CURATOR_PATH}?membership=canceled`);

  const card = page.getByTestId('curator-membership-card');
  await expect(card).toContainText('$5.50/month');
  await expect(joinControl(page)).toHaveText('Retry Checkout');
  await joinControl(page).click();
  await expect.poll(() => state.membershipCheckoutRequests.at(-1)).toEqual({
    planId: currentPlan.membership.planId,
    interval: 'month',
  });
});

test('resumes the selected membership after sign-in', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    curatorPage: fixtureCuratorPage,
    googleAuthUser: fixtureUsers.viewer,
    membershipStatus: fixtureNoMembershipStatus,
  });

  await page.goto(CURATOR_PATH);
  await intervalControl(page.getByTestId('curator-membership-card'), 'year').click();
  await joinControl(page).click();

  await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
  const redirect = await page.evaluate(() => new URL(location.href).searchParams.get('redirect'));
  expect(redirect).toBe(`${CURATOR_PATH}?membership=join&interval=year`);

  await returnFromProvider(page, CHECKOUT_URL, `${CURATOR_PATH}?membership=canceled`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect.poll(() => state.membershipCheckoutRequests.at(-1)).toEqual({
    planId: fixtureCuratorPage.membership!.planId,
    interval: 'year',
  });
  await expect(page.getByTestId('membership-notice')).toHaveText(
    'Checkout was canceled. You were not charged.',
  );

  await page.goto(`${CURATOR_PATH}?membership=join&interval=year`);
  await expect(page.getByTestId('membership-notice')).toHaveText(
    'Choose a billing option and select Join to continue.',
  );
  expect(state.membershipCheckoutRequests).toHaveLength(1);
});

const SOURCE_POST_ID = 'p_20261001120000_sourcepost0001';

test('keeps the post a Join came from through sign-in and sends it to Checkout', async ({ page }) => {
  const captures: MembershipAnalyticsCapture[] = [];
  const { state } = await mockCassetteApp(page, {
    analyticsCaptures: captures,
    curatorPage: fixtureCuratorPage,
    googleAuthUser: fixtureUsers.viewer,
    membershipStatus: fixtureNoMembershipStatus,
  });

  await page.goto(`${CURATOR_PATH}?source_post=${SOURCE_POST_ID}`);
  await joinControl(page).click();

  await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
  const redirect = await page.evaluate(() => new URL(location.href).searchParams.get('redirect'));
  expect(redirect).toBe(`${CURATOR_PATH}?membership=join&interval=month&source_post=${SOURCE_POST_ID}`);

  await returnFromProvider(page, CHECKOUT_URL, `${CURATOR_PATH}?membership=canceled`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect.poll(() => state.membershipCheckoutRequests.at(-1)).toEqual({
    planId: fixtureCuratorPage.membership!.planId,
    interval: 'month',
    sourcePostId: SOURCE_POST_ID,
  });
  const checkoutStarted = captures.find((capture) => capture.event === 'membership_checkout_started');
  expect(checkoutStarted?.properties?.post_id).toBe(SOURCE_POST_ID);
});

test('a locked post selected on the curator page becomes the Checkout source', async ({ page }) => {
  const curatorPage = structuredClone(fixtureCuratorPage);
  curatorPage.posts.items = curatorPage.posts.items.map((item) =>
    item.kind === 'locked' ? { ...item, postId: SOURCE_POST_ID } : item);
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage,
    membershipStatus: fixtureNoMembershipStatus,
  });

  await page.goto(CURATOR_PATH);
  // Stripe sends the fan back to a URL that names the source post, as the selection left it.
  await returnFromProvider(page, CHECKOUT_URL, `${CURATOR_PATH}?source_post=${SOURCE_POST_ID}&membership=canceled`);
  await page.locator('[data-testid="curator-locked-post"]:visible').first()
    .getByRole('link', { name: /view .* membership/i })
    .click();
  // The URL keeps the selection, so Join sends it at once and after a remount.
  await expect(page).toHaveURL(new RegExp(`[?&]source_post=${SOURCE_POST_ID}`));
  await joinControl(page).click();
  await expect.poll(() => state.membershipCheckoutRequests.at(-1)).toEqual({
    planId: fixtureCuratorPage.membership!.planId,
    interval: 'month',
    sourcePostId: SOURCE_POST_ID,
  });

  // After the full navigation back from Checkout, a retry still sends the source post.
  await expect(joinControl(page)).toHaveText('Retry Checkout');
  await joinControl(page).click();
  await expect.poll(() => state.membershipCheckoutRequests).toHaveLength(2);
  expect(state.membershipCheckoutRequests.at(-1)?.sourcePostId).toBe(SOURCE_POST_ID);
});

test('does not execute a crafted unavailable annual join URL', async ({ page }) => {
  const monthlyOnlyPage = {
    ...fixtureCuratorPage,
    membership: {
      ...fixtureCuratorPage.membership!,
      annualAmountMinor: null,
      annualServiceFeeMinor: null,
    },
  };
  const { state } = await mockCassetteApp(page, {
    curatorPage: monthlyOnlyPage,
    membershipStatus: fixtureNoMembershipStatus,
  });

  await page.goto(`${CURATOR_PATH}?membership=join&interval=year`);
  await expect(page).not.toHaveURL(/\/auth\/signin/);
  await joinControl(page).click();

  await expect(page.getByTestId('curator-membership-card').getByRole('alert')).toHaveText(
    'Annual billing is not available. Review the monthly option before joining.',
  );
  await expect(joinControl(page)).toBeVisible();
  expect(state.membershipCheckoutRequests).toHaveLength(0);
});
