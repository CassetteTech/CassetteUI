import test from 'node:test';
import assert from 'node:assert/strict';

import type { PaidPromotionCampaign, PaidPromotionPaymentStatus } from '../../types';
import {
  getPaidPromotionReturnState,
  parsePaidPromotionCampaign,
  parsePaidPromotionCampaigns,
  isPaidPromotionCampaignId,
  shouldPollPaidPromotionCampaign,
} from '../paid-promotion-lifecycle';

function campaign(paymentStatus: PaidPromotionPaymentStatus | null): PaidPromotionCampaign {
  return {
    id: 'pmc_TestCampaign1',
    trackId: 't_123456789ABC',
    sourcePlatform: 'spotify',
    rateCardId: 'prc_TestCard1',
    amountMinor: 25000,
    currency: 'USD',
    status: paymentStatus === 'paid' ? 'in_review' : 'pending_payment',
    paymentStatus,
    discountAmountMinor: 0,
    taxAmountMinor: 0,
    finalTotalMinor: 25000,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 25000,
    requestedWindowStart: null,
    requestedWindowEnd: null,
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
  assert.equal(getPaidPromotionReturnState(campaign('disputed')), 'refunded');
  assert.equal(getPaidPromotionReturnState(campaign('charged_back')), 'refunded');
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
  const parsed = parsePaidPromotionCampaign(sparse);
  assert.equal(parsed.taxAmountMinor, null);
  assert.equal(parsed.rateCardId, null);
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
