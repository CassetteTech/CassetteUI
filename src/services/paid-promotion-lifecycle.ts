import type {
  PaidPromotionCampaign,
  PaidPromotionCampaignStatus,
  PaidPromotionPaymentStatus,
} from '@/types';

/**
 * Boundary mapping for promoter-facing paid-promotion responses. Verifies the
 * shape the UI actually renders (objects exist, money fields are integers,
 * required strings present) and passes everything else through. Unknown status
 * strings are tolerated so additive Bridge changes never brick the promoter
 * surfaces; cross-field invariants (checkout-totals arithmetic, rollups) are
 * Bridge/Sentinel's job, not the client's.
 */

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
  return value === null || value === undefined ? null : string(value, path);
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) invalid(path);
  return value;
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null || value === undefined ? null : integer(value, path);
}

export function parsePaidPromotionCampaign(value: unknown): PaidPromotionCampaign {
  const item = record(value, 'campaign');

  return {
    id: string(item.id, 'campaign.id'),
    trackId: string(item.trackId, 'campaign.trackId'),
    sourcePlatform: string(
      item.sourcePlatform,
      'campaign.sourcePlatform',
    ) as PaidPromotionCampaign['sourcePlatform'],
    rateCardId: nullableString(item.rateCardId, 'campaign.rateCardId'),
    amountMinor: integer(item.amountMinor, 'campaign.amountMinor'),
    currency: string(item.currency, 'campaign.currency'),
    status: string(item.status, 'campaign.status') as PaidPromotionCampaignStatus,
    paymentStatus: nullableString(
      item.paymentStatus,
      'campaign.paymentStatus',
    ) as PaidPromotionPaymentStatus | null,
    discountAmountMinor: nullableInteger(item.discountAmountMinor, 'campaign.discountAmountMinor'),
    taxAmountMinor: nullableInteger(item.taxAmountMinor, 'campaign.taxAmountMinor'),
    finalTotalMinor: nullableInteger(item.finalTotalMinor, 'campaign.finalTotalMinor'),
    amountRefundedMinor: nullableInteger(item.amountRefundedMinor, 'campaign.amountRefundedMinor'),
    refundableRemainderMinor: nullableInteger(
      item.refundableRemainderMinor,
      'campaign.refundableRemainderMinor',
    ),
    requestedWindowStart: nullableString(item.requestedWindowStart, 'campaign.requestedWindowStart'),
    requestedWindowEnd: nullableString(item.requestedWindowEnd, 'campaign.requestedWindowEnd'),
    createdAtUtc: string(item.createdAtUtc, 'campaign.createdAtUtc'),
    updatedAtUtc: string(item.updatedAtUtc, 'campaign.updatedAtUtc'),
  };
}

export function parsePaidPromotionCampaigns(value: unknown): PaidPromotionCampaign[] {
  if (!Array.isArray(value)) invalid('campaigns');
  return value.map((campaign, index) => {
    try {
      return parsePaidPromotionCampaign(campaign);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message.replace('campaign.', `campaigns[${index}].`));
      }
      invalid(`campaigns[${index}]`);
    }
  });
}

export function hasKnownPaidPromotionCheckoutTotals(campaign: PaidPromotionCampaign): boolean {
  return campaign.discountAmountMinor !== null &&
    campaign.taxAmountMinor !== null &&
    campaign.finalTotalMinor !== null &&
    campaign.amountRefundedMinor !== null &&
    campaign.refundableRemainderMinor !== null;
}

export type PaidPromotionReturnState =
  | 'not_started'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'refunded'
  | 'unavailable';

export function isPaidPromotionCampaignId(value: string): boolean {
  return value.length <= 40 && /^pmc_[0-9A-Za-z]+$/.test(value);
}

export function getPaidPromotionReturnState(
  campaign: PaidPromotionCampaign
): PaidPromotionReturnState {
  // A campaign with no payment attempt yet is a normal starting point, not an
  // error: the promoter home links here before checkout has ever been opened.
  if (campaign.paymentStatus === null) {
    return 'not_started';
  }

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
    case 'refund_pending':
    case 'partially_refunded':
    case 'refunded':
    case 'disputed':
    case 'charged_back':
      return 'refunded';
    default:
      // Unknown statuses (e.g. a newer Bridge deploy) degrade to a refresh
      // prompt instead of throwing during parse.
      return 'unavailable';
  }
}

export function shouldPollPaidPromotionCampaign(
  campaign: PaidPromotionCampaign
): boolean {
  const state = getPaidPromotionReturnState(campaign);
  return state === 'pending' || state === 'processing';
}
