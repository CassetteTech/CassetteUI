/** Verifies fan membership checkout, return polling, billing management, and privacy-safe analytics. */

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

const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const CHECKOUT_URL = 'https://checkout.stripe.test/membership-session';
const PORTAL_URL = 'https://billing.stripe.test/membership-session';

const joinControl = (page: Page) => page.getByTestId('membership-join');

const intervalControl = (card: Locator, interval: 'month' | 'year') =>
  card.getByText(interval === 'month' ? 'Monthly' : 'Annual', { exact: true });

const manageControl = (page: Page) => page.getByTestId('membership-manage');
type MembershipAnalyticsProperties = {
  curator_id?: string;
  membership_plan_id?: string;
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

async function returnFromProvider(page: Page, providerUrl: string, returnPath: string) {
  const appOrigin = new URL(page.url()).origin;
  await page.route(providerUrl, (route) => route.fulfill({
    status: 302,
    headers: { location: `${appOrigin}${returnPath}` },
  }));
}

for (const price of [
  {
    interval: 'month' as const,
    face: '$5.00',
    fee: '$0.50',
    total: '$5.50',
  },
  {
    interval: 'year' as const,
    face: '$50.00',
    fee: '$5.00',
    total: '$55.00',
  },
]) {
  test(`shows the ${price.interval} fee breakdown and sends only the selected interval`, async ({ page }) => {
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
    await expect(card).toContainText(price.face);
    await expect(card).toContainText(price.fee);
    await expect(card).toContainText(price.total);
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
  await page.getByTestId('membership-view-posts').click();
  await expect(page.getByTestId('feed-filter-members')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid="curator-feed"] h3:visible')).toHaveCount(1);
  await expect(page.getByTestId('membership-billing')).toContainText('$5.50/month');
  await expect(
    page.getByTestId('curator-membership-card').getByRole('link', { name: 'My memberships' }),
  ).toBeVisible();
  // Conversion is confirmed by the backend from paid subscriptions, never by the client return.
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
});

test('keeps manage available but never offers Join when Curator Pro is inactive', async ({ page }) => {
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

test('blocks a new membership when Curator Pro is inactive', async ({ page }) => {
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
  await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureCanceledMembershipStatus,
    membershipPollSequence: [fixtureCanceledMembershipStatus],
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expect(page.getByTestId('membership-notice')).toHaveText(
    'Membership management is up to date.',
  );
  expect(captures.some((capture) => capture.event === 'membership_canceled')).toBe(false);
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

test('treats an unchanged membership after a Portal visit as up to date without waiting', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPage: fixtureMemberCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    membershipPollSequence: [fixtureActiveMembershipStatus],
  });

  await page.goto(CURATOR_PATH);
  await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
  await manageControl(page).click();

  await expect(page.getByTestId('membership-notice')).toHaveText('Membership management is up to date.');
  await expect(page).not.toHaveURL(/membership=/);
  await page.waitForTimeout(2_500);
  expect(state.membershipStatusRequests.length).toBeLessThanOrEqual(3);
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
  await rows.nth(1).getByTestId('my-membership-manage').click();
  await expect.poll(() => state.membershipPortalRequests.at(-1)).toEqual({
    membershipSubscriptionId: 'msb_FixtureMembership02',
  });
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
