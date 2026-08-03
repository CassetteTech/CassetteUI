import type {
  PaidPromotionCampaign,
  PaidPromotionCampaignDeliverable,
  PaidPromotionCampaignStatus,
  PaidPromotionPaymentStatus,
  PaidPromotionRateCard,
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

function absoluteHttpUrl(value: unknown, path: string): string {
  const candidate = string(value, path);
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') invalid(path);
  } catch {
    invalid(path);
  }
  return candidate;
}

function dateTimeString(value: unknown, path: string): string {
  const candidate = string(value, path);
  if (Number.isNaN(Date.parse(candidate))) invalid(path);
  return candidate;
}

function parseDeliverables(value: unknown): PaidPromotionCampaignDeliverable[] {
  if (!Array.isArray(value)) invalid('campaign.deliverables');

  return value.map((candidate, index) => {
    const path = `campaign.deliverables[${index}]`;
    const item = record(candidate, path);
    const status = string(item.status, `${path}.status`);
    if (status !== 'published' && status !== 'verified') invalid(`${path}.status`);

    return {
      channel: string(item.channel, `${path}.channel`) as PaidPromotionCampaignDeliverable['channel'],
      publishedAtUtc: dateTimeString(item.publishedAtUtc, `${path}.publishedAtUtc`),
      evidenceUrl: absoluteHttpUrl(item.evidenceUrl, `${path}.evidenceUrl`),
      status,
    };
  });
}

export function parsePaidPromotionCampaign(value: unknown): PaidPromotionCampaign {
  const item = record(value, 'campaign');

  return {
    id: string(item.id, 'campaign.id'),
    elementId: string(item.elementId, 'campaign.elementId'),
    elementType: string(
      item.elementType,
      'campaign.elementType',
    ) as PaidPromotionCampaign['elementType'],
    sourcePlatform: string(
      item.sourcePlatform,
      'campaign.sourcePlatform',
    ) as PaidPromotionCampaign['sourcePlatform'],
    rateCardId: nullableString(item.rateCardId, 'campaign.rateCardId'),
    amountMinor: integer(item.amountMinor, 'campaign.amountMinor'),
    currency: string(item.currency, 'campaign.currency'),
    weeks: integer(item.weeks, 'campaign.weeks'),
    weeklyAmountMinor: integer(item.weeklyAmountMinor, 'campaign.weeklyAmountMinor'),
    durationDiscountBps: nullableInteger(item.durationDiscountBps, 'campaign.durationDiscountBps'),
    brief: string(item.brief, 'campaign.brief'),
    status: string(item.status, 'campaign.status') as PaidPromotionCampaignStatus,
    rejectionReason: nullableString(item.rejectionReason, 'campaign.rejectionReason'),
    holdKind: nullableString(item.holdKind, 'campaign.holdKind'),
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
    deliverables: parseDeliverables(item.deliverables),
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

/**
 * Display-only mirror of the Bridge's weekly pricing, so the buyer sees the
 * amount before leaving for checkout. The charged amount is always recomputed
 * server-side from the rate card and the chosen weeks; none of this is sent.
 * The discount rounds up like the server's, so a quoted total never reads high.
 */
export function computePaidPromotionPricing(
  rateCard: Pick<PaidPromotionRateCard, 'amountMinor' | 'discountMinWeeks' | 'discountBps'>,
  weeks: number,
): { grossMinor: number; discountMinor: number; totalMinor: number } {
  const grossMinor = rateCard.amountMinor * weeks;
  const discountApplies =
    rateCard.discountMinWeeks !== null &&
    rateCard.discountBps !== null &&
    weeks >= rateCard.discountMinWeeks;
  const discountMinor = discountApplies
    ? Math.ceil((grossMinor * (rateCard.discountBps ?? 0)) / 10_000)
    : 0;

  return { grossMinor, discountMinor, totalMinor: grossMinor - discountMinor };
}

/**
 * Renders a server-owned minor-unit amount using the platform's own currency
 * data, which knows how many minor units each code actually has (JPY has none,
 * USD has two). A code the runtime cannot resolve degrades to the raw code plus
 * a two-decimal amount rather than throwing: these amounts are rendered inline
 * across the intake, so a throw here blanks the whole page instead of one price.
 */
export function formatPaidPromotionMinorAmount(amountMinor: number, currency: string): string {
  const code = currency.trim().toUpperCase();

  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
    if (fractionDigits !== undefined) {
      return formatter.format(amountMinor / 10 ** fractionDigits);
    }
  } catch {
    // Unresolvable currency code — fall through to the plain rendering.
  }

  return `${code} ${(amountMinor / 100).toFixed(2)}`;
}

export type PaidPromotionReturnState =
  | 'not_started'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'refunded'
  | 'disputed'
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
      return 'refunded';
    case 'disputed':
    case 'charged_back':
      // A dispute in progress is not the same customer situation as a clean
      // refund: money movement is contested, not returned.
      return 'disputed';
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
