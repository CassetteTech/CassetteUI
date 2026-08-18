/** Covers strict fan membership status and secure Stripe handoff contracts. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  grantsMembershipAccess,
  parseMembershipCheckout,
  parseMembershipPortal,
  parseMembershipStatus,
} from '../membership';

const statusView = {
  curatorProfileId: 'cpr_0123456789AbCdEfGhIjK',
  canSubscribe: false,
  membership: {
    membershipSubscriptionId: 'msb_0123456789AbCdEfGhIjK',
    planId: 'mpl_0123456789AbCdEfGhIjK',
    billingInterval: 'month',
    status: 'active',
    canManage: true,
    cancelAtPeriodEnd: false,
    paidThroughUtc: '2026-09-01T00:00:00+00:00',
  },
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
