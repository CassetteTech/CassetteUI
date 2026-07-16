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

void test('does not infer payment truth from a campaign status or unknown payment state', () => {
  const missingPayment = campaign(null);
  missingPayment.status = 'in_review';

  assert.equal(getPaidPromotionReturnState(missingPayment), 'unavailable');
  assert.equal(getPaidPromotionReturnState(campaign('refunded')), 'unavailable');

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
});

void test('accepts only opaque paid-promotion campaign ids', () => {
  assert.equal(isPaidPromotionCampaignId('pmc_0123AbCd'), true);
  assert.equal(isPaidPromotionCampaignId('pmc_'), false);
  assert.equal(isPaidPromotionCampaignId('campaign-123'), false);
  assert.equal(isPaidPromotionCampaignId('pmc_abc/return'), false);
});

void test('validates discount, tax, final total, and refundable remainder as server truth', () => {
  const response = {
    ...campaign('paid'),
    discountAmountMinor: 5000,
    taxAmountMinor: 1500,
    finalTotalMinor: 21500,
    amountRefundedMinor: 3500,
    refundableRemainderMinor: 18000,
  };

  assert.equal(parsePaidPromotionCampaign(response).finalTotalMinor, 21500);
  assert.throws(
    () => parsePaidPromotionCampaign({ ...response, finalTotalMinor: 25000 }),
    /campaign\.finalTotalMinor/,
  );
  assert.throws(
    () => parsePaidPromotionCampaign({ ...response, refundableRemainderMinor: 17000 }),
    /campaign\.refundableRemainderMinor/,
  );
  const missingTax = { ...response } as Record<string, unknown>;
  delete missingTax.taxAmountMinor;
  assert.throws(() => parsePaidPromotionCampaign(missingTax), /campaign\.taxAmountMinor/);
});

void test('accepts coordinated unknown totals and a legitimate zero-total checkout', () => {
  const unknown = {
    ...campaign('pending'),
    discountAmountMinor: null,
    taxAmountMinor: null,
    finalTotalMinor: null,
    refundableRemainderMinor: null,
  };
  assert.equal(parsePaidPromotionCampaign(unknown).finalTotalMinor, null);

  const zeroTotal = {
    ...campaign('paid'),
    discountAmountMinor: 25000,
    taxAmountMinor: 0,
    finalTotalMinor: 0,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 0,
  };
  assert.equal(getPaidPromotionReturnState(parsePaidPromotionCampaign(zeroTotal)), 'paid');
});

void test('strictly parses the owner campaign collection', () => {
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
    () => parsePaidPromotionCampaigns([{ ...campaign('paid'), status: 'mystery' }]),
    /campaigns\[0\]\.status/,
  );
  assert.throws(
    () => parsePaidPromotionCampaigns([{ ...campaign('paid'), trackId: 'track-from-route' }]),
    /campaigns\[0\]\.trackId/,
  );
  assert.throws(
    () => parsePaidPromotionCampaigns([campaign('pending'), campaign('paid')]),
    /campaigns\[1\]\.id/,
  );
});
