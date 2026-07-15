import test from 'node:test';
import assert from 'node:assert/strict';

import type { PaidPromotionCampaign, PaidPromotionPaymentStatus } from '../../types';
import {
  getPaidPromotionReturnState,
  isPaidPromotionCampaignId,
  shouldPollPaidPromotionCampaign,
} from '../paid-promotion-lifecycle';

function campaign(paymentStatus: PaidPromotionPaymentStatus | null): PaidPromotionCampaign {
  return {
    id: 'pmc_TestCampaign1',
    trackId: 't_TestTrack001',
    sourcePlatform: 'spotify',
    rateCardId: 'prc_TestCard1',
    amountMinor: 25000,
    currency: 'USD',
    status: paymentStatus === 'paid' ? 'in_review' : 'pending_payment',
    paymentStatus,
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
