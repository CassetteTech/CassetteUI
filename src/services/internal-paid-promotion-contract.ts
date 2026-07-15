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
  PaidPromotionAttestedRelationship,
  PaidPromotionCampaignStatus,
  PaidPromotionDeliverableChannel,
  PaidPromotionDeliverableStatus,
  PaidPromotionExceptionKind,
  PaidPromotionExceptionStatus,
  PaidPromotionPaymentStatus,
  PaidPromotionPricingMode,
} from '@/types';

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

const SOURCE_PLATFORMS = ['spotify', 'applemusic', 'deezer'] as const;
const PRICING_MODES = ['rate_card', 'manual_quote'] as const satisfies readonly PaidPromotionPricingMode[];
const RELATIONSHIPS = [
  'self_artist',
  'manager',
  'label',
  'agency',
  'other',
] as const satisfies readonly PaidPromotionAttestedRelationship[];
const EXCEPTION_KINDS = [
  'webhook_error',
  'reconciliation_mismatch',
  'refund_failed',
  'dispute_opened',
  'stuck_pending',
  'orphan_session',
] as const satisfies readonly PaidPromotionExceptionKind[];
const EXCEPTION_STATUSES = ['open', 'resolved'] as const satisfies readonly PaidPromotionExceptionStatus[];

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
  return value === null ? null : string(value, path);
}

function nullableHttpUrl(value: unknown, path: string): string | null {
  const result = nullableString(value, path);
  if (result === null) return null;

  try {
    const url = new URL(result);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') invalid(path);
  } catch {
    invalid(path);
  }
  return result;
}

function dateString(value: unknown, path: string): string {
  const result = string(value, path);
  if (Number.isNaN(Date.parse(result))) invalid(path);
  return result;
}

function nullableDateString(value: unknown, path: string): string | null {
  return value === null ? null : dateString(value, path);
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid(path);
  return value;
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null ? null : integer(value, path);
}

function member<const T extends readonly string[]>(value: unknown, allowed: T, path: string): T[number] {
  const result = string(value, path);
  if (!allowed.includes(result)) invalid(path);
  return result as T[number];
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
  const amountMinor = integer(item.amountMinor, `${path}.amountMinor`);
  const amountRefundedMinor = integer(item.amountRefundedMinor, `${path}.amountRefundedMinor`);
  if (amountRefundedMinor > amountMinor) invalid(`${path}.amountRefundedMinor`);

  return {
    id: string(item.id, `${path}.id`),
    amountMinor,
    currency: string(item.currency, `${path}.currency`),
    amountRefundedMinor,
    status: member(item.status, PAID_PROMOTION_PAYMENT_STATUSES, `${path}.status`),
    statusChangedAtUtc: dateString(item.statusChangedAtUtc, `${path}.statusChangedAtUtc`),
    paidAtUtc: nullableDateString(item.paidAtUtc, `${path}.paidAtUtc`),
    updatedAtUtc: dateString(item.updatedAtUtc, `${path}.updatedAtUtc`),
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
    channel: member(item.channel, PAID_PROMOTION_DELIVERABLE_CHANNELS, `${path}.channel`),
    plannedAtUtc: nullableDateString(item.plannedAtUtc, `${path}.plannedAtUtc`),
    publishedAtUtc: nullableDateString(item.publishedAtUtc, `${path}.publishedAtUtc`),
    evidenceUrl: nullableHttpUrl(item.evidenceUrl, `${path}.evidenceUrl`),
    status: member(item.status, PAID_PROMOTION_DELIVERABLE_STATUSES, `${path}.status`),
    notes: item.notes === null ? null : string(item.notes, `${path}.notes`, true),
    createdAtUtc: dateString(item.createdAtUtc, `${path}.createdAtUtc`),
    updatedAtUtc: dateString(item.updatedAtUtc, `${path}.updatedAtUtc`),
  };
}

export function parseInternalPaidPromotionException(
  value: unknown,
  path = 'exception'
): InternalPaidPromotionException {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    kind: member(item.kind, EXCEPTION_KINDS, `${path}.kind`),
    paymentId: nullableString(item.paymentId, `${path}.paymentId`),
    campaignId: nullableString(item.campaignId, `${path}.campaignId`),
    status: member(item.status, EXCEPTION_STATUSES, `${path}.status`),
    createdAtUtc: dateString(item.createdAtUtc, `${path}.createdAtUtc`),
    resolvedAtUtc: nullableDateString(item.resolvedAtUtc, `${path}.resolvedAtUtc`),
  };
}

function parseSnapshot(value: unknown, path: string): InternalPaidPromotionPricingSnapshot {
  const item = record(value, path);
  return {
    id: string(item.id, `${path}.id`),
    sourceRateCardId: string(item.sourceRateCardId, `${path}.sourceRateCardId`),
    amountMinor: integer(item.amountMinor, `${path}.amountMinor`),
    currency: string(item.currency, `${path}.currency`),
    createdAtUtc: dateString(item.createdAtUtc, `${path}.createdAtUtc`),
  };
}

function validateQuotePair(amountMinor: number | null, currency: string | null, path: string) {
  if ((amountMinor === null) !== (currency === null)) invalid(path);
}

export function parseInternalPaidPromotionCampaignSummary(
  value: unknown,
  path = 'campaign'
): InternalPaidPromotionCampaignSummary {
  const item = record(value, path);
  const amountMinor = nullableInteger(item.amountMinor, `${path}.amountMinor`);
  const currency = nullableString(item.currency, `${path}.currency`);
  validateQuotePair(amountMinor, currency, `${path}.quote`);

  return {
    id: string(item.id, `${path}.id`),
    trackId: string(item.trackId, `${path}.trackId`),
    trackTitle: string(item.trackTitle, `${path}.trackTitle`),
    sourcePlatform: member(item.sourcePlatform, SOURCE_PLATFORMS, `${path}.sourcePlatform`),
    pricingMode: member(item.pricingMode, PRICING_MODES, `${path}.pricingMode`),
    amountMinor,
    currency,
    status: member(item.status, PAID_PROMOTION_CAMPAIGN_STATUSES, `${path}.status`),
    paymentStatus: item.paymentStatus === null
      ? null
      : member(item.paymentStatus, PAID_PROMOTION_PAYMENT_STATUSES, `${path}.paymentStatus`),
    openExceptionCount: integer(item.openExceptionCount, `${path}.openExceptionCount`),
    createdAtUtc: dateString(item.createdAtUtc, `${path}.createdAtUtc`),
    updatedAtUtc: dateString(item.updatedAtUtc, `${path}.updatedAtUtc`),
  };
}

export function parseInternalPaidPromotionCampaignDetail(
  value: unknown
): InternalPaidPromotionCampaignDetail {
  const item = record(value, 'campaign');
  const amountMinor = nullableInteger(item.amountMinor, 'campaign.amountMinor');
  const currency = nullableString(item.currency, 'campaign.currency');
  validateQuotePair(amountMinor, currency, 'campaign.quote');

  return {
    id: string(item.id, 'campaign.id'),
    track: parseTrack(item.track, 'campaign.track'),
    sourcePlatform: member(item.sourcePlatform, SOURCE_PLATFORMS, 'campaign.sourcePlatform'),
    brief: string(item.brief, 'campaign.brief', true),
    pricingMode: member(item.pricingMode, PRICING_MODES, 'campaign.pricingMode'),
    rateCardId: nullableString(item.rateCardId, 'campaign.rateCardId'),
    amountMinor,
    currency,
    status: member(item.status, PAID_PROMOTION_CAMPAIGN_STATUSES, 'campaign.status'),
    statusChangedAtUtc: dateString(item.statusChangedAtUtc, 'campaign.statusChangedAtUtc'),
    requestedWindowStart: nullableDateString(item.requestedWindowStart, 'campaign.requestedWindowStart'),
    requestedWindowEnd: nullableDateString(item.requestedWindowEnd, 'campaign.requestedWindowEnd'),
    attestedAtUtc: nullableDateString(item.attestedAtUtc, 'campaign.attestedAtUtc'),
    attestationVersion: nullableString(item.attestationVersion, 'campaign.attestationVersion'),
    attestedRelationship: item.attestedRelationship === null
      ? null
      : member(item.attestedRelationship, RELATIONSHIPS, 'campaign.attestedRelationship'),
    payment: item.payment === null ? null : parsePayment(item.payment, 'campaign.payment'),
    pricingSnapshots: parseInternalPaidPromotionArray(item.pricingSnapshots, 'campaign.pricingSnapshots').map((snapshot, index) =>
      parseSnapshot(snapshot, `campaign.pricingSnapshots[${index}]`)
    ),
    deliverables: parseInternalPaidPromotionArray(item.deliverables, 'campaign.deliverables').map((deliverable, index) =>
      parseInternalPaidPromotionDeliverable(deliverable, `campaign.deliverables[${index}]`)
    ),
    exceptions: parseInternalPaidPromotionArray(item.exceptions, 'campaign.exceptions').map((exception, index) =>
      parseInternalPaidPromotionException(exception, `campaign.exceptions[${index}]`)
    ),
    createdAtUtc: dateString(item.createdAtUtc, 'campaign.createdAtUtc'),
    updatedAtUtc: dateString(item.updatedAtUtc, 'campaign.updatedAtUtc'),
  };
}

export function parseInternalPaidPromotionAction(value: unknown): InternalPaidPromotionActionResponse {
  const item = record(value, 'action');
  const amountMinor = nullableInteger(item.amountMinor, 'action.amountMinor');
  const currency = nullableString(item.currency, 'action.currency');
  validateQuotePair(amountMinor, currency, 'action.quote');
  return {
    campaignId: string(item.campaignId, 'action.campaignId'),
    status: member(item.status, PAID_PROMOTION_CAMPAIGN_STATUSES, 'action.status'),
    paymentStatus: item.paymentStatus === null
      ? null
      : member(item.paymentStatus, PAID_PROMOTION_PAYMENT_STATUSES, 'action.paymentStatus'),
    amountMinor,
    currency,
    updatedAtUtc: dateString(item.updatedAtUtc, 'action.updatedAtUtc'),
  };
}

export function parseInternalPaidPromotionRefund(
  value: unknown
): InternalPaidPromotionRefundResponse {
  const item = record(value, 'refund');
  const paymentStatus = member(item.paymentStatus, PAID_PROMOTION_PAYMENT_STATUSES, 'refund.paymentStatus');
  if (paymentStatus !== 'refund_pending') invalid('refund.paymentStatus');
  return {
    campaignId: string(item.campaignId, 'refund.campaignId'),
    paymentId: string(item.paymentId, 'refund.paymentId'),
    paymentStatus,
    amountRefundedMinor: integer(item.amountRefundedMinor, 'refund.amountRefundedMinor'),
    updatedAtUtc: dateString(item.updatedAtUtc, 'refund.updatedAtUtc'),
  };
}
