import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseInternalPaidPromotionCampaignDetail,
  parseInternalPaidPromotionCampaignSummary,
  parseInternalPaidPromotionRefund,
} from '../internal-paid-promotion-contract';

const timestamp = '2026-07-15T12:00:00Z';

function campaignDetail(): Record<string, unknown> {
  return {
    id: 'pmc_TestCampaign1',
    track: {
      id: 't_TestTrack001',
      title: 'Signal Fire',
      coverArtUrl: null,
      artists: ['Mia Groove'],
    },
    sourcePlatform: 'spotify',
    brief: 'Internal campaign brief.',
    pricingMode: 'rate_card',
    rateCardId: 'prc_TestCard1',
    amountMinor: 25000,
    currency: 'USD',
    status: 'in_review',
    statusChangedAtUtc: timestamp,
    requestedWindowStart: null,
    requestedWindowEnd: null,
    attestedAtUtc: timestamp,
    attestationVersion: 'paid-promotion-authority-v1',
    attestedRelationship: 'self_artist',
    payment: {
      id: 'pmp_TestPayment1',
      amountMinor: 25000,
      currency: 'USD',
      amountRefundedMinor: 0,
      status: 'paid',
      statusChangedAtUtc: timestamp,
      paidAtUtc: timestamp,
      updatedAtUtc: timestamp,
    },
    pricingSnapshots: [],
    deliverables: [],
    exceptions: [],
    createdAtUtc: timestamp,
    updatedAtUtc: timestamp,
  };
}

void test('accepts the complete internal paid-promotion detail contract', () => {
  const parsed = parseInternalPaidPromotionCampaignDetail(campaignDetail());

  assert.equal(parsed.id, 'pmc_TestCampaign1');
  assert.equal(parsed.payment?.status, 'paid');
  assert.equal(parsed.attestedRelationship, 'self_artist');
});

void test('fails visibly on unknown or missing campaign and payment states', () => {
  const unknownCampaign = campaignDetail();
  unknownCampaign.status = 'future_state';
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(unknownCampaign),
    /campaign\.status/,
  );

  const missingCampaign = campaignDetail();
  delete missingCampaign.status;
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(missingCampaign),
    /campaign\.status/,
  );

  const unknownPayment = campaignDetail();
  unknownPayment.payment = {
    ...(unknownPayment.payment as Record<string, unknown>),
    status: 'provider_future_state',
  };
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(unknownPayment),
    /campaign\.payment\.status/,
  );
});

void test('rejects incomplete quote pairs and unsafe evidence URLs', () => {
  const incompleteQuote = campaignDetail();
  incompleteQuote.currency = null;
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(incompleteQuote),
    /campaign\.quote/,
  );

  const unsafeEvidence = campaignDetail();
  unsafeEvidence.deliverables = [{
    id: 'pmd_TestDeliverable1',
    campaignId: 'pmc_TestCampaign1',
    channel: 'instagram',
    plannedAtUtc: null,
    publishedAtUtc: null,
    evidenceUrl: 'javascript:alert(1)',
    status: 'planned',
    notes: null,
    createdAtUtc: timestamp,
    updatedAtUtc: timestamp,
  }];
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(unsafeEvidence),
    /evidenceUrl/,
  );
});

void test('validates queue states before rendering them', () => {
  const summary = {
    id: 'pmc_TestCampaign1',
    trackId: 't_TestTrack001',
    trackTitle: 'Signal Fire',
    sourcePlatform: 'spotify',
    pricingMode: 'manual_quote',
    amountMinor: 25000,
    currency: 'USD',
    status: 'in_review',
    paymentStatus: 'paid',
    openExceptionCount: 1,
    createdAtUtc: timestamp,
    updatedAtUtc: timestamp,
  };

  assert.equal(parseInternalPaidPromotionCampaignSummary(summary).status, 'in_review');
  assert.throws(
    () => parseInternalPaidPromotionCampaignSummary({ ...summary, status: 'unknown' }),
    /campaign\.status/,
  );
});

void test('accepts only refund_pending initiation truth without changing refunded totals', () => {
  const response = {
    campaignId: 'pmc_TestCampaign1',
    paymentId: 'pmp_TestPayment1',
    paymentStatus: 'refund_pending',
    amountRefundedMinor: 0,
    updatedAtUtc: timestamp,
  };

  const parsed = parseInternalPaidPromotionRefund(response);
  assert.equal(parsed.paymentStatus, 'refund_pending');
  assert.equal(parsed.amountRefundedMinor, 0);
  assert.throws(
    () => parseInternalPaidPromotionRefund({ ...response, paymentStatus: 'partially_refunded' }),
    /refund\.paymentStatus/,
  );
  assert.throws(
    () => parseInternalPaidPromotionRefund({ ...response, paymentStatus: 'refunded' }),
    /refund\.paymentStatus/,
  );
});
