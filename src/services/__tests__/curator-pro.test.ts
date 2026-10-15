import assert from 'node:assert/strict';
import test from 'node:test';
import {
  curatorProCheckoutSchema,
  curatorProPortalSchema,
  curatorProStatusSchema,
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
  available: true,
};

void test('status parser accepts the public contract and strips correlation metadata', () => {
  const parsed = curatorProStatusSchema.parse({
    ...status,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });

  assert.equal(parsed.monthlyPriceMinor, 500);
  assert.equal('correlationId' in parsed, false);
  assert.throws(() => curatorProStatusSchema.parse({ ...status, correlationId: 'not-a-uuid' }));
  assert.throws(() => curatorProStatusSchema.parse({ ...status, stripeSubscriptionId: 'sub_secret' }));
  assert.throws(() => curatorProStatusSchema.parse({ ...status, status: 'pending_review' }));
});

void test('status parser requires safe pricing and a consistent discount state', () => {
  const temporary = curatorProStatusSchema.parse({
    ...status,
    status: 'active',
    discountKind: 'temporary',
    discountEndsAtUtc: '2026-09-01T00:00:00Z',
  });
  const forever = curatorProStatusSchema.parse({
    ...status,
    discountKind: 'forever',
  });

  assert.equal(temporary.discountKind, 'temporary');
  assert.equal(forever.discountKind, 'forever');
  assert.throws(() => curatorProStatusSchema.parse({
    ...status,
    monthlyPriceMinor: Number.MAX_SAFE_INTEGER + 1,
  }));
  assert.throws(() => curatorProStatusSchema.parse({ ...status, platformFeeBps: 10_001 }));
  assert.throws(() => curatorProStatusSchema.parse({
    ...status,
    discountKind: 'temporary',
  }));
  assert.throws(() => curatorProStatusSchema.parse({
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
  const parsedCheckout = curatorProCheckoutSchema.parse({
    ...checkout,
    correlationId: '44444444-4444-4444-8444-444444444444',
  });
  const parsedPortal = curatorProPortalSchema.parse({
    portalUrl: 'https://billing.stripe.test/session',
    correlationId: '44444444-4444-4444-8444-444444444444',
  });

  assert.equal(parsedCheckout.checkoutUrl, checkout.checkoutUrl);
  assert.equal('correlationId' in parsedCheckout, false);
  assert.equal(parsedPortal.portalUrl, 'https://billing.stripe.test/session');
  assert.equal('correlationId' in parsedPortal, false);
  assert.throws(() => curatorProCheckoutSchema.parse({ ...checkout, checkoutUrl: 'http://stripe.test/session' }));
  assert.throws(() => curatorProCheckoutSchema.parse({ ...checkout, stripePriceId: 'price_secret' }));
  assert.throws(() => curatorProPortalSchema.parse({ portalUrl: 'javascript:alert(1)' }));
});
