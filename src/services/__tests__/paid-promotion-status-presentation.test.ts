import test from 'node:test';
import assert from 'node:assert/strict';

import type { PaidPromotionCampaignStatus, PaidPromotionPaymentStatus } from '../../types';
import {
  getPaidPromotionPaymentStatusLabel,
  getPaidPromotionStatusLabel,
  getPaidPromotionStatusPresentation,
} from '../paid-promotion-status-presentation';

const ALL_CAMPAIGN_STATUSES: PaidPromotionCampaignStatus[] = [
  'draft',
  'pending_payment',
  'in_review',
  'needs_info',
  'scheduled',
  'fulfilling',
  'delivered',
  'completed',
  'expired',
  'canceled',
  'rejected',
  'refunded_closed',
  'on_hold',
];

const ALL_PAYMENT_STATUSES: PaidPromotionPaymentStatus[] = [
  'created',
  'pending',
  'processing',
  'paid',
  'expired',
  'failed',
  'refund_pending',
  'partially_refunded',
  'refunded',
  'disputed',
  'charged_back',
];

void test('every campaign status has complete customer-language presentation', () => {
  for (const status of ALL_CAMPAIGN_STATUSES) {
    const presentation = getPaidPromotionStatusPresentation({ status, holdKind: null });
    assert.ok(presentation.label.length > 0, `${status} label`);
    assert.ok(presentation.explanation.length > 0, `${status} explanation`);
    assert.ok(presentation.nextAction.length > 0, `${status} next action`);
    assert.ok(['you', 'cassette', 'none'].includes(presentation.actor), `${status} actor`);
  }
});

void test('no customer-facing status string contains internal vocabulary', () => {
  for (const status of ALL_CAMPAIGN_STATUSES) {
    const presentation = getPaidPromotionStatusPresentation({ status, holdKind: null });
    for (const text of [presentation.label, presentation.explanation, presentation.nextAction]) {
      assert.doesNotMatch(text, /webhook|persisted|_/i, `${status}: ${text}`);
    }
  }
});

void test('a rejected campaign states the refund expectation', () => {
  const presentation = getPaidPromotionStatusPresentation({ status: 'rejected', holdKind: null });
  assert.match(presentation.nextAction, /refund/i);
});

void test('needs info makes the customer action explicit', () => {
  const presentation = getPaidPromotionStatusPresentation({ status: 'needs_info', holdKind: null });
  assert.equal(presentation.actor, 'you');
  assert.match(presentation.nextAction, /reply/i);
});

void test('a dispute hold is explained differently from a generic hold', () => {
  const dispute = getPaidPromotionStatusPresentation({
    status: 'on_hold',
    holdKind: 'payment_dispute',
  });
  const generic = getPaidPromotionStatusPresentation({ status: 'on_hold', holdKind: 'other' });
  assert.match(dispute.explanation, /dispute/i);
  assert.notEqual(dispute.explanation, generic.explanation);
  // Dispute copy never carries internal identifiers either.
  assert.doesNotMatch(dispute.explanation, /stripe_dispute|dp_/);
});

void test('unknown statuses degrade to a refresh prompt, not machine words', () => {
  const presentation = getPaidPromotionStatusPresentation({
    status: 'brand_new_status' as PaidPromotionCampaignStatus,
    holdKind: null,
  });
  assert.equal(presentation.label, 'Status unavailable');
  assert.equal(getPaidPromotionStatusLabel('brand_new_status'), 'Status unavailable');
});

void test('every payment status has a customer-language label', () => {
  for (const status of ALL_PAYMENT_STATUSES) {
    const label = getPaidPromotionPaymentStatusLabel(status);
    assert.ok(label.length > 0, status);
    assert.doesNotMatch(label, /webhook|persisted|_/i, `${status}: ${label}`);
  }
  assert.equal(getPaidPromotionPaymentStatusLabel('mystery'), 'Status unavailable');
});
