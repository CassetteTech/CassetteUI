import test from 'node:test';
import assert from 'node:assert/strict';

import type { PaidPromotionCampaign, PaidPromotionPaymentStatus } from '../../types';
import {
  computePaidPromotionPricing,
  formatPaidPromotionMinorAmount,
  getPaidPromotionReturnState,
  parsePaidPromotionCampaign,
  parsePaidPromotionCampaigns,
  isPaidPromotionCampaignId,
  shouldPollPaidPromotionCampaign,
} from '../paid-promotion-lifecycle';

function campaign(paymentStatus: PaidPromotionPaymentStatus | null): PaidPromotionCampaign {
  return {
    id: 'pmc_TestCampaign1',
    elementId: 't_123456789ABC',
    elementType: 'track',
    sourcePlatform: 'spotify',
    rateCardId: 'prc_TestCard1',
    amountMinor: 25000,
    currency: 'USD',
    weeks: 1,
    weeklyAmountMinor: 25000,
    durationDiscountBps: null,
    brief: 'Share this release with listeners who follow indie soul.',
    status: paymentStatus === 'paid' ? 'in_review' : 'pending_payment',
    rejectionReason: null,
    holdKind: null,
    paymentStatus,
    discountAmountMinor: 0,
    taxAmountMinor: 0,
    finalTotalMinor: 25000,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 25000,
    requestedWindowStart: null,
    requestedWindowEnd: null,
    deliverables: [],
    createdAtUtc: '2026-07-15T12:00:00Z',
    updatedAtUtc: '2026-07-15T12:00:00Z',
  };
}

void test('maps persisted payment statuses to return-page states', () => {
  assert.equal(getPaidPromotionReturnState(campaign('created')), 'pending');
  assert.equal(getPaidPromotionReturnState(campaign('pending')), 'pending');
  assert.equal(getPaidPromotionReturnState(campaign('processing')), 'processing');
  assert.equal(getPaidPromotionReturnState(campaign('paid')), 'paid');
  assert.equal(getPaidPromotionReturnState(campaign('failed')), 'failed');
  assert.equal(getPaidPromotionReturnState(campaign('expired')), 'expired');
});

void test('maps a campaign with no payment attempt to not_started', () => {
  assert.equal(getPaidPromotionReturnState(campaign(null)), 'not_started');
});

void test('maps the refund family to refunded, not an error state', () => {
  assert.equal(getPaidPromotionReturnState(campaign('refund_pending')), 'refunded');
  assert.equal(getPaidPromotionReturnState(campaign('partially_refunded')), 'refunded');
  assert.equal(getPaidPromotionReturnState(campaign('refunded')), 'refunded');
});

void test('keeps disputes distinct from clean refunds', () => {
  assert.equal(getPaidPromotionReturnState(campaign('disputed')), 'disputed');
  assert.equal(getPaidPromotionReturnState(campaign('charged_back')), 'disputed');
});

void test('does not infer payment truth from unknown states or unknown totals', () => {
  const unknownStatus = campaign('paid');
  unknownStatus.paymentStatus = 'mystery_future_status' as PaidPromotionPaymentStatus;
  assert.equal(getPaidPromotionReturnState(unknownStatus), 'unavailable');

  const unknownTotals = campaign('paid');
  unknownTotals.discountAmountMinor = null;
  unknownTotals.taxAmountMinor = null;
  unknownTotals.finalTotalMinor = null;
  unknownTotals.refundableRemainderMinor = null;
  assert.equal(getPaidPromotionReturnState(unknownTotals), 'unavailable');
});

void test('polls only non-terminal payment states', () => {
  assert.equal(shouldPollPaidPromotionCampaign(campaign('pending')), true);
  assert.equal(shouldPollPaidPromotionCampaign(campaign('processing')), true);
  assert.equal(shouldPollPaidPromotionCampaign(campaign('paid')), false);
  assert.equal(shouldPollPaidPromotionCampaign(campaign('failed')), false);
  assert.equal(shouldPollPaidPromotionCampaign(campaign(null)), false);
});

void test('accepts only opaque paid-promotion campaign ids', () => {
  assert.equal(isPaidPromotionCampaignId('pmc_0123AbCd'), true);
  assert.equal(isPaidPromotionCampaignId('pmc_'), false);
  assert.equal(isPaidPromotionCampaignId('campaign-123'), false);
  assert.equal(isPaidPromotionCampaignId('pmc_abc/return'), false);
});

void test('verifies the rendered shape but does not re-audit server arithmetic', () => {
  const response = {
    ...campaign('paid'),
    discountAmountMinor: 5000,
    taxAmountMinor: 1500,
    finalTotalMinor: 21500,
    amountRefundedMinor: 3500,
    refundableRemainderMinor: 18000,
  };
  assert.equal(parsePaidPromotionCampaign(response).finalTotalMinor, 21500);

  // Server totals pass through even when they don't satisfy the checkout
  // formula; auditing that invariant is Bridge/Sentinel's job.
  assert.equal(
    parsePaidPromotionCampaign({ ...response, finalTotalMinor: 25000 }).finalTotalMinor,
    25000,
  );

  // Wrong primitive types on money fields are still boundary failures.
  assert.throws(
    () => parsePaidPromotionCampaign({ ...response, amountMinor: '25000' }),
    /campaign\.amountMinor/,
  );
  assert.throws(
    () => parsePaidPromotionCampaign({ ...response, finalTotalMinor: 1.5 }),
    /campaign\.finalTotalMinor/,
  );
});

void test('tolerates additive backend changes', () => {
  const withUnknownStatus = {
    ...campaign('pending'),
    status: 'brand_new_status',
    extraField: 'ignored',
  };
  assert.equal(parsePaidPromotionCampaign(withUnknownStatus).status, 'brand_new_status');

  // Missing nullable fields degrade to null instead of throwing.
  const sparse = { ...campaign('pending') } as Record<string, unknown>;
  delete sparse.taxAmountMinor;
  delete sparse.rateCardId;
  delete sparse.rejectionReason;
  delete sparse.holdKind;
  const parsed = parsePaidPromotionCampaign(sparse);
  assert.equal(parsed.taxAmountMinor, null);
  assert.equal(parsed.rateCardId, null);
  assert.equal(parsed.rejectionReason, null);
  assert.equal(parsed.holdKind, null);
});

void test('passes rejection reason and hold kind through the boundary', () => {
  const parsed = parsePaidPromotionCampaign({
    ...campaign('paid'),
    rejectionReason: 'Track rights could not be verified.',
    holdKind: 'payment_dispute',
  });
  assert.equal(parsed.rejectionReason, 'Track rights could not be verified.');
  assert.equal(parsed.holdKind, 'payment_dispute');
});

void test('parses only customer-safe published deliverables', () => {
  const parsed = parsePaidPromotionCampaign({
    ...campaign('paid'),
    deliverables: [
      {
        channel: 'instagram',
        publishedAtUtc: '2026-07-18T14:30:00Z',
        evidenceUrl: 'https://social.example/published',
        status: 'published',
      },
      {
        channel: 'reddit',
        publishedAtUtc: '2026-07-19T09:00:00Z',
        evidenceUrl: 'https://social.example/verified',
        status: 'verified',
      },
    ],
  });

  assert.equal(parsed.deliverables.length, 2);
  assert.equal(parsed.deliverables[1].status, 'verified');
  assert.throws(
    () => parsePaidPromotionCampaign({
      ...campaign('paid'),
      deliverables: [{
        channel: 'instagram',
        publishedAtUtc: '2026-07-18T14:30:00Z',
        evidenceUrl: 'https://social.example/planned',
        status: 'planned',
      }],
    }),
    /campaign\.deliverables\[0\]\.status/,
  );
  assert.throws(
    () => parsePaidPromotionCampaign({
      ...campaign('paid'),
      deliverables: [{
        channel: 'instagram',
        publishedAtUtc: '2026-07-18T14:30:00Z',
        evidenceUrl: 'javascript:alert(1)',
        status: 'published',
      }],
    }),
    /campaign\.deliverables\[0\]\.evidenceUrl/,
  );
});

void test('parses the owner campaign collection with indexed errors', () => {
  const paidCampaign = {
    ...campaign('paid'),
    id: 'pmc_TestCampaign2',
  };
  assert.deepEqual(
    parsePaidPromotionCampaigns([campaign('pending'), paidCampaign]).map((item) => item.id),
    ['pmc_TestCampaign1', 'pmc_TestCampaign2'],
  );
  assert.deepEqual(parsePaidPromotionCampaigns([]), []);
  assert.throws(
    () => parsePaidPromotionCampaigns({ campaigns: [] }),
    /paid-promotion server response: campaigns/,
  );
  assert.throws(
    () => parsePaidPromotionCampaigns([{ ...campaign('paid'), amountMinor: null }]),
    /campaigns\[0\]\.amountMinor/,
  );
});

void test('carries the weekly pricing snapshot through the boundary', () => {
  const parsed = parsePaidPromotionCampaign({
    ...campaign('paid'),
    elementId: 'a_123456789ABC',
    elementType: 'album',
    weeks: 4,
    weeklyAmountMinor: 2500,
    durationDiscountBps: 1000,
  });
  assert.equal(parsed.elementId, 'a_123456789ABC');
  assert.equal(parsed.elementType, 'album');
  assert.equal(parsed.weeks, 4);
  assert.equal(parsed.weeklyAmountMinor, 2500);
  assert.equal(parsed.durationDiscountBps, 1000);

  // Weeks and the weekly rate are required from pending_payment onward; a
  // missing one is a boundary failure, not a silent zero.
  assert.throws(
    () => parsePaidPromotionCampaign({ ...campaign('paid'), weeks: null }),
    /campaign\.weeks/,
  );
});

void test('mirrors the server duration-discount math for display', () => {
  const card = { amountMinor: 2500, discountMinWeeks: 4, discountBps: 1000 };

  // Below the threshold there is no discount at all.
  assert.deepEqual(computePaidPromotionPricing(card, 3), {
    grossMinor: 7500,
    discountMinor: 0,
    totalMinor: 7500,
  });

  // At and above it, the discount rounds up so the shown total never exceeds
  // what the Bridge charges.
  assert.deepEqual(computePaidPromotionPricing(card, 4), {
    grossMinor: 10000,
    discountMinor: 1000,
    totalMinor: 9000,
  });
  assert.equal(
    computePaidPromotionPricing({ amountMinor: 333, discountMinWeeks: 2, discountBps: 1000 }, 2)
      .discountMinor,
    67,
  );

  // A package with no discount configured never discounts.
  assert.equal(
    computePaidPromotionPricing({ amountMinor: 2500, discountMinWeeks: null, discountBps: null }, 8)
      .totalMinor,
    20000,
  );
});

void test("renders minor amounts using the currency's own minor-unit size", () => {
  // A two-minor-unit currency: 2500 minor units is 25 major units.
  assert.match(formatPaidPromotionMinorAmount(2500, 'USD'), /25[.,]00/);
  // A zero-minor-unit currency is not divided by 100.
  assert.match(formatPaidPromotionMinorAmount(2500, 'JPY'), /2.?500/);
});

void test('degrades instead of throwing when the currency cannot be resolved', () => {
  // These amounts render inline all over the intake, so throwing on a currency
  // the runtime does not know would blank the page instead of one price.
  assert.equal(formatPaidPromotionMinorAmount(2500, 'US'), 'US 25.00');
  assert.equal(formatPaidPromotionMinorAmount(2500, 'usdollar'), 'USDOLLAR 25.00');
});
