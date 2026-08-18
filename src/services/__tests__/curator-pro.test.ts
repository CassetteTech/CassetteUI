/** Verifies strict Curator Pro status and Stripe handoff response parsing. */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseCuratorProCheckout,
  parseCuratorProPortal,
  parseCuratorProStatus,
} from '../curator-pro';

const status = {
  hasAccess: false,
  canSubscribe: true,
  status: null,
  monthlyPriceMinor: 500,
  currency: 'USD',
  platformFeeBps: 1000,
  discountKind: 'none',
  discountEndsAtUtc: null,
  canManage: false,
  cancelAtPeriodEnd: false,
  paidThroughUtc: null,
};

void test('status parser accepts the public contract and strips correlation metadata', () => {
  const parsed = parseCuratorProStatus({
    ...status,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });

  assert.equal(parsed.monthlyPriceMinor, 500);
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => parseCuratorProStatus({ ...status, correlationId: 'not-a-uuid' }));
  assert.throws(() => parseCuratorProStatus({ ...status, stripeSubscriptionId: 'sub_secret' }));
  assert.throws(() => parseCuratorProStatus({ ...status, status: 'pending_review' }));
});

void test('status parser requires safe pricing and a consistent discount state', () => {
  const temporary = parseCuratorProStatus({
    ...status,
    status: 'active',
    discountKind: 'temporary',
    discountEndsAtUtc: '2026-09-01T00:00:00Z',
  });
  const forever = parseCuratorProStatus({
    ...status,
    discountKind: 'forever',
  });

  assert.equal(temporary.discountKind, 'temporary');
  assert.equal(forever.discountKind, 'forever');
  assert.throws(() => parseCuratorProStatus({
    ...status,
    monthlyPriceMinor: Number.MAX_SAFE_INTEGER + 1,
  }));
  assert.throws(() => parseCuratorProStatus({ ...status, platformFeeBps: 10_001 }));
  assert.throws(() => parseCuratorProStatus({
    ...status,
    discountKind: 'temporary',
  }));
  assert.throws(() => parseCuratorProStatus({
    ...status,
    discountKind: 'forever',
    discountEndsAtUtc: '2026-09-01T00:00:00Z',
  }));
});

void test('Checkout and Portal parsers require strict HTTPS handoff contracts', () => {
  const checkout = {
    checkoutUrl: 'https://checkout.stripe.test/session',
    status: 'incomplete',
    monthlyPriceMinor: 500,
    currency: 'USD',
  };
  const parsedCheckout = parseCuratorProCheckout({
    ...checkout,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  const parsedPortal = parseCuratorProPortal({
    portalUrl: 'https://billing.stripe.test/session',
    correlationId: '44444444-4444-4444-8444-444444444444',
  });

  assert.equal(parsedCheckout.checkoutUrl, checkout.checkoutUrl);
  assert.equal('correlationId' in parsedCheckout, false);
  assert.equal(parsedPortal.portalUrl, 'https://billing.stripe.test/session');
  assert.equal('correlationId' in parsedPortal, false);
  assert.throws(() => parseCuratorProCheckout({ ...checkout, checkoutUrl: 'http://stripe.test/session' }));
  assert.throws(() => parseCuratorProCheckout({ ...checkout, stripePriceId: 'price_secret' }));
  assert.throws(() => parseCuratorProPortal({ portalUrl: 'javascript:alert(1)' }));
});
