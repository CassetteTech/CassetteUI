import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseInternalPaidPromotionCampaignDetail,
  parseInternalPaidPromotionCampaignSummary,
  parseInternalPaidPromotionDeliverable,
  parseInternalPaidPromotionRefund,
} from '../internal-paid-promotion-contract';

const timestamp = '2026-07-15T12:00:00Z';

function campaignDetail(): Record<string, unknown> {
  return {
    id: 'pmc_TestCampaign1',
    subject: {
      id: 't_TestTrack001',
      elementType: 'track',
      title: 'Signal Fire',
      coverArtUrl: null,
      subtitleNames: ['Mia Groove'],
    },
    sourcePlatform: 'spotify',
    brief: 'Internal campaign brief.',
    pricingMode: 'rate_card',
    rateCardId: 'prc_TestCard1',
    amountMinor: 25000,
    currency: 'USD',
    weeks: 4,
    weeklyAmountMinor: 6250,
    durationDiscountBps: null,
    weeklyDeliverableMinimum: 2,
    weeksDelivered: 1,
    policyRefundableMinor: 18750,
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
      discountAmountMinor: 5000,
      taxAmountMinor: 1500,
      finalTotalMinor: 21500,
      amountRefundedMinor: 0,
      refundableRemainderMinor: 21500,
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

void test('tolerates unknown campaign and payment states so the console keeps rendering', () => {
  // Additive Bridge enum values must never brick the surface ops would use to
  // investigate them; unknown strings pass through to the UI.
  const unknownCampaign = campaignDetail();
  unknownCampaign.status = 'future_state';
  assert.equal(parseInternalPaidPromotionCampaignDetail(unknownCampaign).status, 'future_state');

  const unknownPayment = campaignDetail();
  unknownPayment.payment = {
    ...(unknownPayment.payment as Record<string, unknown>),
    status: 'provider_future_state',
  };
  assert.equal(
    parseInternalPaidPromotionCampaignDetail(unknownPayment).payment?.status,
    'provider_future_state',
  );

  // A missing required field is still a boundary failure.
  const missingCampaign = campaignDetail();
  delete missingCampaign.status;
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(missingCampaign),
    /campaign\.status/,
  );
});

void test('rejects unsafe evidence URLs at the boundary', () => {
  const unsafeEvidence = campaignDetail();
  unsafeEvidence.deliverables = [{
    id: 'pmd_TestDeliverable1',
    campaignId: 'pmc_TestCampaign1',
    postId: null,
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

void test('passes deliverable post ids through without format gating', () => {
  const deliverable = {
    id: 'pmd_TestDeliverable1',
    campaignId: 'pmc_TestCampaign1',
    postId: 'p_20260715120000_abcdefghijklmn',
    channel: 'instagram',
    plannedAtUtc: null,
    publishedAtUtc: null,
    evidenceUrl: null,
    status: 'planned',
    notes: null,
    createdAtUtc: timestamp,
    updatedAtUtc: timestamp,
  };

  assert.equal(parseInternalPaidPromotionDeliverable(deliverable).postId, deliverable.postId);
  assert.equal(parseInternalPaidPromotionDeliverable({ ...deliverable, postId: null }).postId, null);
});

void test('preserves server totals without re-auditing checkout arithmetic', () => {
  const discounted = parseInternalPaidPromotionCampaignDetail(campaignDetail());
  assert.equal(discounted.payment?.finalTotalMinor, 21500);
  assert.equal(discounted.payment?.refundableRemainderMinor, 21500);

  // Totals that don't satisfy the checkout formula still parse; that
  // invariant is reconciliation/Sentinel's job.
  const inconsistent = campaignDetail();
  inconsistent.payment = {
    ...(inconsistent.payment as Record<string, unknown>),
    finalTotalMinor: 22000,
  };
  assert.equal(
    parseInternalPaidPromotionCampaignDetail(inconsistent).payment?.finalTotalMinor,
    22000,
  );

  const unknown = campaignDetail();
  unknown.payment = {
    ...(unknown.payment as Record<string, unknown>),
    discountAmountMinor: null,
    taxAmountMinor: null,
    finalTotalMinor: null,
    refundableRemainderMinor: null,
  };
  assert.equal(parseInternalPaidPromotionCampaignDetail(unknown).payment?.finalTotalMinor, null);

  // Wrong primitive types on money fields remain boundary failures.
  const wrongType = campaignDetail();
  wrongType.payment = {
    ...(wrongType.payment as Record<string, unknown>),
    amountMinor: '25000',
  };
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(wrongType),
    /campaign\.payment\.amountMinor/,
  );
});

void test('parses queue summaries and tolerates unknown states', () => {
  const summary = {
    id: 'pmc_TestCampaign1',
    elementId: 'a_TestAlbum001',
    elementType: 'album',
    title: 'Signal Fire (Deluxe)',
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
  assert.equal(
    parseInternalPaidPromotionCampaignSummary({ ...summary, status: 'unknown' }).status,
    'unknown',
  );
  assert.throws(
    () => parseInternalPaidPromotionCampaignSummary({ ...summary, title: undefined }),
    /campaign\.title/,
  );
});

void test('parses refund responses without gating the reported status', () => {
  const response = {
    campaignId: 'pmc_TestCampaign1',
    paymentId: 'pmp_TestPayment1',
    paymentStatus: 'refund_pending',
    finalTotalMinor: 21500,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 21500,
    updatedAtUtc: timestamp,
  };

  const parsed = parseInternalPaidPromotionRefund(response);
  assert.equal(parsed.paymentStatus, 'refund_pending');
  assert.equal(parsed.amountRefundedMinor, 0);
  assert.equal(parsed.refundableRemainderMinor, 21500);

  // A refund that already settled reports its real status instead of failing.
  assert.equal(
    parseInternalPaidPromotionRefund({ ...response, paymentStatus: 'refunded' }).paymentStatus,
    'refunded',
  );
  assert.throws(
    () => parseInternalPaidPromotionRefund({ ...response, amountRefundedMinor: null }),
    /refund\.amountRefundedMinor/,
  );
});

void test('carries the effort-week refund numbers as advisory nullables', () => {
  const parsed = parseInternalPaidPromotionCampaignDetail(campaignDetail());
  assert.equal(parsed.subject.elementType, 'track');
  assert.equal(parsed.weeks, 4);
  assert.equal(parsed.weeklyDeliverableMinimum, 2);
  assert.equal(parsed.weeksDelivered, 1);
  assert.equal(parsed.policyRefundableMinor, 18750);

  // A campaign priced before the weekly columns existed still renders; the
  // console shows "unavailable" rather than inventing a policy number.
  const unpriced = { ...campaignDetail() } as Record<string, unknown>;
  delete unpriced.weeks;
  delete unpriced.weeksDelivered;
  delete unpriced.policyRefundableMinor;
  const parsedUnpriced = parseInternalPaidPromotionCampaignDetail(unpriced);
  assert.equal(parsedUnpriced.weeks, null);
  assert.equal(parsedUnpriced.weeksDelivered, null);
  assert.equal(parsedUnpriced.policyRefundableMinor, null);

  // A subject with no secondary names is valid; a missing list is not.
  const missing = campaignDetail() as Record<string, unknown>;
  missing.subject = { id: 'r_TestArtist01', elementType: 'artist', title: 'Mia Groove', coverArtUrl: null };
  assert.throws(
    () => parseInternalPaidPromotionCampaignDetail(missing),
    /campaign\.subject\.subtitleNames/,
  );
});
