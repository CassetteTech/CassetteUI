/** Covers strict fan membership status and secure Stripe handoff contracts. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  grantsMembershipAccess,
  parseMembershipCheckout,
  parseMembershipPortal,
  parseMembershipStatus,
  parseMyMemberships,
} from '../membership';

const subscription = {
  membershipSubscriptionId: 'msb_0123456789AbCdEfGhIjK',
  planId: 'mpl_0123456789AbCdEfGhIjK',
  billingInterval: 'month',
  status: 'active',
  canManage: true,
  cancelAtPeriodEnd: false,
  paidThroughUtc: '2026-09-01T00:00:00+00:00',
  faceAmountMinor: 500,
  serviceFeeMinor: 50,
  totalAmountMinor: 550,
  currency: 'USD',
} as const;

const statusView = {
  curatorProfileId: 'cpr_0123456789AbCdEfGhIjK',
  canSubscribe: false,
  membership: subscription,
};

void test('membership parsers accept the public contract and reject provider fields', () => {
  const parsed = parseMembershipStatus({
    ...statusView,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(parsed.membership?.status, 'active');
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...statusView.membership, stripeSubscriptionId: 'sub_secret' },
  }));
  assert.throws(() => parseMembershipStatus({ ...statusView, curatorProfileId: 'curator-1' }));
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...subscription, totalAmountMinor: 551 },
  }));
  assert.throws(() => parseMembershipStatus({
    ...statusView,
    membership: { ...subscription, currency: 'usd' },
  }));
});

void test('my memberships parser keeps only the fan contract', () => {
  const entry = {
    curatorProfileId: 'cpr_0123456789AbCdEfGhIjK',
    curatorUsername: 'crate_digger',
    curatorDisplayName: 'Crate Digger',
    membership: subscription,
  };
  assert.equal(parseMyMemberships([entry]).length, 1);
  assert.deepEqual(parseMyMemberships([]), []);
  assert.throws(() => parseMyMemberships([{ ...entry, fanEmail: 'fan@example.com' }]));
});

void test('billing copy comes from the subscription price and paid-through date', () => {
  assert.equal(describeMembershipBilling(subscription), '$5.50/month · renews Sep 1, 2026 · tax extra');
  assert.equal(
    describeMembershipBilling({ ...subscription, cancelAtPeriodEnd: true }),
    '$5.50/month · ends Sep 1, 2026',
  );
  assert.equal(
    describeMembershipBilling({ ...subscription, billingInterval: 'year', totalAmountMinor: 5500, faceAmountMinor: 5000, serviceFeeMinor: 500, paidThroughUtc: null }),
    '$55.00/year · tax extra',
  );
  // A stale paid-through date must never read as a promised renewal while payment is failing or paused.
  for (const status of ['past_due', 'unpaid', 'paused', 'incomplete'] as const) {
    const line = describeMembershipBilling({ ...subscription, status });
    assert.doesNotMatch(line, /renews|Sep 1, 2026/);
    assert.match(line, /^\$5\.50\/month/);
  }
  assert.match(describeMembershipBilling({ ...subscription, status: 'paused' }), /paused/);
  assert.equal(describeMembershipStanding(subscription), null);
  assert.match(describeMembershipStanding({ ...subscription, status: 'past_due' }) ?? '', /payment method/);
  assert.match(describeMembershipStanding({ ...subscription, cancelAtPeriodEnd: true }) ?? '', /Sep 1, 2026/);
});

void test('Checkout parser requires a safe exact total and HTTPS handoff', () => {
  const checkout = {
    membershipSubscriptionId: 'msb_0123456789AbCdEfGhIjK',
    planId: 'mpl_0123456789AbCdEfGhIjK',
    billingInterval: 'year',
    status: 'incomplete',
    checkoutUrl: 'https://checkout.stripe.test/session',
    faceAmountMinor: 5000,
    serviceFeeMinor: 500,
    totalAmountMinor: 5500,
    currency: 'USD',
  };

  const parsed = parseMembershipCheckout({
    ...checkout,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(parsed.totalAmountMinor, 5500);
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseMembershipCheckout({ ...checkout, totalAmountMinor: 5501 }));
  assert.throws(() => parseMembershipCheckout({ ...checkout, checkoutUrl: 'http://stripe.test/session' }));
});

void test('Portal parser requires HTTPS and standing access follows the backend lifecycle', () => {
  const parsed = parseMembershipPortal({
    portalUrl: 'https://billing.stripe.test/session',
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  assert.equal(
    parsed.portalUrl,
    'https://billing.stripe.test/session',
  );
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseMembershipPortal({ portalUrl: 'javascript:alert(1)' }));

  assert.equal(grantsMembershipAccess('trialing'), true);
  assert.equal(grantsMembershipAccess('active'), true);
  assert.equal(grantsMembershipAccess('past_due'), true);
  assert.equal(grantsMembershipAccess('unpaid'), false);
  assert.equal(grantsMembershipAccess('canceled'), false);
});
