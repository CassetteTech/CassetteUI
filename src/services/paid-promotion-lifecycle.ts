import type {
  PaidPromotionCampaign,
  PaidPromotionCampaignStatus,
  PaidPromotionPaymentStatus,
} from '@/types';

const CAMPAIGN_STATUSES = [
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

const PAYMENT_STATUSES = [
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

const SOURCE_PLATFORMS = ['spotify', 'applemusic', 'deezer'] as const;

type JsonRecord = Record<string, unknown>;

function invalid(path: string): never {
  throw new Error(`Invalid paid-promotion server response: ${path}.`);
}

function record(value: unknown, path: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path);
  return value as JsonRecord;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(path);
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid(path);
  return value;
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null ? null : integer(value, path);
}

function dateString(value: unknown, path: string): string {
  const result = string(value, path);
  if (Number.isNaN(Date.parse(result))) invalid(path);
  return result;
}

function nullableDateString(value: unknown, path: string): string | null {
  return value === null ? null : dateString(value, path);
}

function member<const T extends readonly string[]>(value: unknown, allowed: T, path: string): T[number] {
  const result = string(value, path);
  if (!allowed.includes(result)) invalid(path);
  return result as T[number];
}

function parseCheckoutTotals(item: JsonRecord, amountMinor: number) {
  const discountAmountMinor = nullableInteger(item.discountAmountMinor, 'campaign.discountAmountMinor');
  const taxAmountMinor = nullableInteger(item.taxAmountMinor, 'campaign.taxAmountMinor');
  const finalTotalMinor = nullableInteger(item.finalTotalMinor, 'campaign.finalTotalMinor');
  const amountRefundedMinor = nullableInteger(item.amountRefundedMinor, 'campaign.amountRefundedMinor');
  const refundableRemainderMinor = nullableInteger(
    item.refundableRemainderMinor,
    'campaign.refundableRemainderMinor',
  );
  const totals = [discountAmountMinor, taxAmountMinor, finalTotalMinor, refundableRemainderMinor];
  const knownCount = totals.filter((value) => value !== null).length;

  if (knownCount !== 0 && knownCount !== totals.length) invalid('campaign.checkoutTotals');
  if (knownCount === totals.length) {
    if (amountRefundedMinor === null) invalid('campaign.amountRefundedMinor');
    if (discountAmountMinor! > amountMinor) invalid('campaign.discountAmountMinor');
    if (finalTotalMinor !== amountMinor - discountAmountMinor! + taxAmountMinor!) {
      invalid('campaign.finalTotalMinor');
    }
    if (amountRefundedMinor > finalTotalMinor ||
        refundableRemainderMinor !== finalTotalMinor - amountRefundedMinor) {
      invalid('campaign.refundableRemainderMinor');
    }
  }

  return {
    discountAmountMinor,
    taxAmountMinor,
    finalTotalMinor,
    amountRefundedMinor,
    refundableRemainderMinor,
  };
}

export function parsePaidPromotionCampaign(value: unknown): PaidPromotionCampaign {
  const item = record(value, 'campaign');
  const amountMinor = integer(item.amountMinor, 'campaign.amountMinor');

  return {
    id: string(item.id, 'campaign.id'),
    trackId: string(item.trackId, 'campaign.trackId'),
    sourcePlatform: member(item.sourcePlatform, SOURCE_PLATFORMS, 'campaign.sourcePlatform'),
    rateCardId: nullableString(item.rateCardId, 'campaign.rateCardId'),
    amountMinor,
    currency: string(item.currency, 'campaign.currency'),
    status: member(item.status, CAMPAIGN_STATUSES, 'campaign.status'),
    paymentStatus: item.paymentStatus === null
      ? null
      : member(item.paymentStatus, PAYMENT_STATUSES, 'campaign.paymentStatus'),
    ...parseCheckoutTotals(item, amountMinor),
    requestedWindowStart: nullableDateString(item.requestedWindowStart, 'campaign.requestedWindowStart'),
    requestedWindowEnd: nullableDateString(item.requestedWindowEnd, 'campaign.requestedWindowEnd'),
    createdAtUtc: dateString(item.createdAtUtc, 'campaign.createdAtUtc'),
    updatedAtUtc: dateString(item.updatedAtUtc, 'campaign.updatedAtUtc'),
  };
}

export function hasKnownPaidPromotionCheckoutTotals(campaign: PaidPromotionCampaign): boolean {
  return campaign.discountAmountMinor !== null &&
    campaign.taxAmountMinor !== null &&
    campaign.finalTotalMinor !== null &&
    campaign.amountRefundedMinor !== null &&
    campaign.refundableRemainderMinor !== null;
}

export type PaidPromotionReturnState =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'unavailable';

export function isPaidPromotionCampaignId(value: string): boolean {
  return /^pmc_[0-9A-Za-z]+$/.test(value);
}

export function getPaidPromotionReturnState(
  campaign: PaidPromotionCampaign
): PaidPromotionReturnState {
  switch (campaign.paymentStatus) {
    case 'created':
    case 'pending':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'paid':
      return hasKnownPaidPromotionCheckoutTotals(campaign) ? 'paid' : 'unavailable';
    case 'failed':
      return 'failed';
    case 'expired':
      return 'expired';
    default:
      return 'unavailable';
  }
}

export function shouldPollPaidPromotionCampaign(
  campaign: PaidPromotionCampaign
): boolean {
  const state = getPaidPromotionReturnState(campaign);
  return state === 'pending' || state === 'processing';
}
