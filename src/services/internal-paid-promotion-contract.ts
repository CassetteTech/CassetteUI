import type {
  InternalPaidPromotionActionResponse,
  InternalPaidPromotionCampaignDetail,
  InternalPaidPromotionCampaignSummary,
  InternalPaidPromotionDeliverable,
  InternalPaidPromotionException,
  InternalPaidPromotionPayment,
  InternalPaidPromotionPricingSnapshot,
  InternalPaidPromotionRefundResponse,
  InternalPaidPromotionTrack,
  PaidPromotionCampaignStatus,
  PaidPromotionDeliverableChannel,
  PaidPromotionDeliverableStatus,
  PaidPromotionPaymentStatus,
} from '@/types';

/**
 * Boundary mapping for the internal paid-promotions console. Verifies the
 * shape the console renders and passes everything else through: unknown enum
 * values are tolerated so an additive Bridge change never bricks the surface
 * ops would use to investigate it. Money arithmetic and cross-record
 * invariants are audited server-side (reconciliation/Sentinel), not here.
 *
 * The exported status/channel arrays drive filter dropdowns and form selects;
 * they are deliberately not used as parse gates.
 */

export const PAID_PROMOTION_CAMPAIGN_STATUSES = [
  'draft',
  'pending_payment',
  'in_review',
  'scheduled',
  'fulfilling',
  'delivered',
  'completed',
  'expired',
  'canceled',
  'rejected',
  'refunded_closed',
  'on_hold',
] as const satisfies readonly PaidPromotionCampaignStatus[];

export const PAID_PROMOTION_PAYMENT_STATUSES = [
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
] as const satisfies readonly PaidPromotionPaymentStatus[];

export const PAID_PROMOTION_DELIVERABLE_CHANNELS = [
  'instagram',
  'tiktok',
  'x',
  'reddit',
  'other',
] as const satisfies readonly PaidPromotionDeliverableChannel[];

export const PAID_PROMOTION_DELIVERABLE_STATUSES = [
  'planned',
  'scheduled',
  'published',
  'verified',
  'failed',
  'removed',
] as const satisfies readonly PaidPromotionDeliverableStatus[];

type JsonRecord = Record<string, unknown>;

function invalid(path: string): never {
  throw new Error(`Invalid paid-promotion server response: ${path}.`);
}

function record(value: unknown, path: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path);
  return value as JsonRecord;
}

export function parseInternalPaidPromotionArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(path);
  return value;
}

function string(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) invalid(path);
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null || value === undefined ? null : string(value, path);
}

export function isPaidPromotionDeliverablePostId(value: string): boolean {
  return /^p_\d{14}_[0-9a-z]{14}$/.test(value);
}

function nullableHttpUrl(value: unknown, path: string): string | null {
  const result = nullableString(value, path);
  if (result === null) return null;

  // Rendered as link/image targets; refuse non-http(s) schemes at the boundary.
  try {
    const url = new URL(result);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') invalid(path);
  } catch {
    invalid(path);
  }
  return result;
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) invalid(path);
  return value;
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null || value === undefined ? null : integer(value, path);
}

function parseTrack(value: unknown, path: string): InternalPaidPromotionTrack {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    title: string(item.title, `${path}.title`),
    coverArtUrl: nullableHttpUrl(item.coverArtUrl, `${path}.coverArtUrl`),
    artists: parseInternalPaidPromotionArray(item.artists, `${path}.artists`).map((artist, index) =>
      string(artist, `${path}.artists[${index}]`)
    ),
  };
}

function parsePayment(value: unknown, path: string): InternalPaidPromotionPayment {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    amountMinor: integer(item.amountMinor, `${path}.amountMinor`),
    currency: string(item.currency, `${path}.currency`),
    discountAmountMinor: nullableInteger(item.discountAmountMinor, `${path}.discountAmountMinor`),
    taxAmountMinor: nullableInteger(item.taxAmountMinor, `${path}.taxAmountMinor`),
    finalTotalMinor: nullableInteger(item.finalTotalMinor, `${path}.finalTotalMinor`),
    amountRefundedMinor: integer(item.amountRefundedMinor, `${path}.amountRefundedMinor`),
    refundableRemainderMinor: nullableInteger(
      item.refundableRemainderMinor,
      `${path}.refundableRemainderMinor`,
    ),
    status: string(item.status, `${path}.status`) as PaidPromotionPaymentStatus,
    statusChangedAtUtc: string(item.statusChangedAtUtc, `${path}.statusChangedAtUtc`),
    paidAtUtc: nullableString(item.paidAtUtc, `${path}.paidAtUtc`),
    updatedAtUtc: string(item.updatedAtUtc, `${path}.updatedAtUtc`),
  };
}

export function parseInternalPaidPromotionDeliverable(
  value: unknown,
  path = 'deliverable'
): InternalPaidPromotionDeliverable {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    campaignId: string(item.campaignId, `${path}.campaignId`),
    postId: nullableString(item.postId, `${path}.postId`),
    channel: string(item.channel, `${path}.channel`) as PaidPromotionDeliverableChannel,
    plannedAtUtc: nullableString(item.plannedAtUtc, `${path}.plannedAtUtc`),
    publishedAtUtc: nullableString(item.publishedAtUtc, `${path}.publishedAtUtc`),
    evidenceUrl: nullableHttpUrl(item.evidenceUrl, `${path}.evidenceUrl`),
    status: string(item.status, `${path}.status`) as PaidPromotionDeliverableStatus,
    notes: item.notes === null || item.notes === undefined
      ? null
      : string(item.notes, `${path}.notes`, true),
    createdAtUtc: string(item.createdAtUtc, `${path}.createdAtUtc`),
    updatedAtUtc: string(item.updatedAtUtc, `${path}.updatedAtUtc`),
  };
}

export function parseInternalPaidPromotionException(
  value: unknown,
  path = 'exception'
): InternalPaidPromotionException {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    kind: string(item.kind, `${path}.kind`) as InternalPaidPromotionException['kind'],
    paymentId: nullableString(item.paymentId, `${path}.paymentId`),
    campaignId: nullableString(item.campaignId, `${path}.campaignId`),
    status: string(item.status, `${path}.status`) as InternalPaidPromotionException['status'],
    createdAtUtc: string(item.createdAtUtc, `${path}.createdAtUtc`),
    resolvedAtUtc: nullableString(item.resolvedAtUtc, `${path}.resolvedAtUtc`),
  };
}

function parseSnapshot(value: unknown, path: string): InternalPaidPromotionPricingSnapshot {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    sourceRateCardId: string(item.sourceRateCardId, `${path}.sourceRateCardId`),
    amountMinor: integer(item.amountMinor, `${path}.amountMinor`),
    currency: string(item.currency, `${path}.currency`),
    createdAtUtc: string(item.createdAtUtc, `${path}.createdAtUtc`),
  };
}

export function parseInternalPaidPromotionCampaignSummary(
  value: unknown,
  path = 'campaign'
): InternalPaidPromotionCampaignSummary {
  const item = record(value, path);

  return {
    id: string(item.id, `${path}.id`),
    trackId: string(item.trackId, `${path}.trackId`),
    trackTitle: string(item.trackTitle, `${path}.trackTitle`),
    sourcePlatform: string(
      item.sourcePlatform,
      `${path}.sourcePlatform`,
    ) as InternalPaidPromotionCampaignSummary['sourcePlatform'],
    pricingMode: string(
      item.pricingMode,
      `${path}.pricingMode`,
    ) as InternalPaidPromotionCampaignSummary['pricingMode'],
    amountMinor: nullableInteger(item.amountMinor, `${path}.amountMinor`),
    currency: nullableString(item.currency, `${path}.currency`),
    status: string(item.status, `${path}.status`) as PaidPromotionCampaignStatus,
    paymentStatus: nullableString(
      item.paymentStatus,
      `${path}.paymentStatus`,
    ) as PaidPromotionPaymentStatus | null,
    openExceptionCount: integer(item.openExceptionCount, `${path}.openExceptionCount`),
    createdAtUtc: string(item.createdAtUtc, `${path}.createdAtUtc`),
    updatedAtUtc: string(item.updatedAtUtc, `${path}.updatedAtUtc`),
  };
}

export function parseInternalPaidPromotionCampaignDetail(
  value: unknown
): InternalPaidPromotionCampaignDetail {
  const item = record(value, 'campaign');

  return {
    id: string(item.id, 'campaign.id'),
    track: parseTrack(item.track, 'campaign.track'),
    sourcePlatform: string(
      item.sourcePlatform,
      'campaign.sourcePlatform',
    ) as InternalPaidPromotionCampaignDetail['sourcePlatform'],
    brief: string(item.brief, 'campaign.brief', true),
    pricingMode: string(
      item.pricingMode,
      'campaign.pricingMode',
    ) as InternalPaidPromotionCampaignDetail['pricingMode'],
    rateCardId: nullableString(item.rateCardId, 'campaign.rateCardId'),
    amountMinor: nullableInteger(item.amountMinor, 'campaign.amountMinor'),
    currency: nullableString(item.currency, 'campaign.currency'),
    status: string(item.status, 'campaign.status') as PaidPromotionCampaignStatus,
    statusChangedAtUtc: string(item.statusChangedAtUtc, 'campaign.statusChangedAtUtc'),
    requestedWindowStart: nullableString(item.requestedWindowStart, 'campaign.requestedWindowStart'),
    requestedWindowEnd: nullableString(item.requestedWindowEnd, 'campaign.requestedWindowEnd'),
    attestedAtUtc: nullableString(item.attestedAtUtc, 'campaign.attestedAtUtc'),
    attestationVersion: nullableString(item.attestationVersion, 'campaign.attestationVersion'),
    attestedRelationship: nullableString(
      item.attestedRelationship,
      'campaign.attestedRelationship',
    ) as InternalPaidPromotionCampaignDetail['attestedRelationship'],
    payment: item.payment === null || item.payment === undefined
      ? null
      : parsePayment(item.payment, 'campaign.payment'),
    pricingSnapshots: parseInternalPaidPromotionArray(item.pricingSnapshots, 'campaign.pricingSnapshots').map((snapshot, index) =>
      parseSnapshot(snapshot, `campaign.pricingSnapshots[${index}]`)
    ),
    deliverables: parseInternalPaidPromotionArray(item.deliverables, 'campaign.deliverables').map((deliverable, index) =>
      parseInternalPaidPromotionDeliverable(deliverable, `campaign.deliverables[${index}]`)
    ),
    exceptions: parseInternalPaidPromotionArray(item.exceptions, 'campaign.exceptions').map((exception, index) =>
      parseInternalPaidPromotionException(exception, `campaign.exceptions[${index}]`)
    ),
    createdAtUtc: string(item.createdAtUtc, 'campaign.createdAtUtc'),
    updatedAtUtc: string(item.updatedAtUtc, 'campaign.updatedAtUtc'),
  };
}

export function parseInternalPaidPromotionAction(value: unknown): InternalPaidPromotionActionResponse {
  const item = record(value, 'action');
  return {
    campaignId: string(item.campaignId, 'action.campaignId'),
    status: string(item.status, 'action.status') as PaidPromotionCampaignStatus,
    paymentStatus: nullableString(
      item.paymentStatus,
      'action.paymentStatus',
    ) as PaidPromotionPaymentStatus | null,
    amountMinor: nullableInteger(item.amountMinor, 'action.amountMinor'),
    currency: nullableString(item.currency, 'action.currency'),
    updatedAtUtc: string(item.updatedAtUtc, 'action.updatedAtUtc'),
  };
}

export function parseInternalPaidPromotionRefund(
  value: unknown
): InternalPaidPromotionRefundResponse {
  const item = record(value, 'refund');
  return {
    campaignId: string(item.campaignId, 'refund.campaignId'),
    paymentId: string(item.paymentId, 'refund.paymentId'),
    paymentStatus: string(item.paymentStatus, 'refund.paymentStatus') as PaidPromotionPaymentStatus,
    finalTotalMinor: nullableInteger(item.finalTotalMinor, 'refund.finalTotalMinor'),
    amountRefundedMinor: integer(item.amountRefundedMinor, 'refund.amountRefundedMinor'),
    refundableRemainderMinor: nullableInteger(
      item.refundableRemainderMinor,
      'refund.refundableRemainderMinor',
    ),
    updatedAtUtc: string(item.updatedAtUtc, 'refund.updatedAtUtc'),
  };
}
