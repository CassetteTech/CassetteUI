import type {
  PaidPromotionCampaignStatus,
  PaidPromotionSubject,
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

const CAMPAIGN_STATUS_SET = new Set<string>(CAMPAIGN_STATUSES);

type JsonRecord = Record<string, unknown>;

function invalid(path: string): never {
  throw new Error(`Invalid paid-promotion subject response: ${path}.`);
}

function record(value: unknown, path: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path);
  return value as JsonRecord;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(path);
  return value;
}

function nullableHttpUrl(value: unknown, path: string): string | null {
  if (value === null) return null;
  const result = string(value, path);

  try {
    const url = new URL(result);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') invalid(path);
  } catch {
    invalid(path);
  }

  return result;
}

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) invalid(path);
  return value;
}

function dateString(value: unknown, path: string): string {
  const result = string(value, path);
  if (Number.isNaN(Date.parse(result))) invalid(path);
  return result;
}

function parseStatusCounts(
  value: unknown,
  campaignCount: number,
  path: string,
): Partial<Record<PaidPromotionCampaignStatus, number>> {
  const item = record(value, path);
  const result: Partial<Record<PaidPromotionCampaignStatus, number>> = {};
  let total = 0;

  for (const [status, countValue] of Object.entries(item)) {
    if (!CAMPAIGN_STATUS_SET.has(status)) invalid(`${path}.${status}`);
    const count = positiveInteger(countValue, `${path}.${status}`);
    result[status as PaidPromotionCampaignStatus] = count;
    total += count;
    if (!Number.isSafeInteger(total)) invalid(path);
  }

  if (total !== campaignCount) invalid(path);
  return result;
}

export function parsePaidPromotionSubject(
  value: unknown,
  path = 'subject',
): PaidPromotionSubject {
  const item = record(value, path);
  const trackId = string(item.trackId, `${path}.trackId`);
  if (!/^t_[1-9A-HJ-NP-Za-km-z]{12}$/.test(trackId)) invalid(`${path}.trackId`);

  if (!Array.isArray(item.artists)) invalid(`${path}.artists`);
  const artists = item.artists.map((artist, index) =>
    string(artist, `${path}.artists[${index}]`)
  );
  const campaignCount = positiveInteger(item.campaignCount, `${path}.campaignCount`);
  const firstCampaignAtUtc = dateString(item.firstCampaignAtUtc, `${path}.firstCampaignAtUtc`);
  const latestCampaignAtUtc = dateString(item.latestCampaignAtUtc, `${path}.latestCampaignAtUtc`);
  if (Date.parse(firstCampaignAtUtc) > Date.parse(latestCampaignAtUtc)) {
    invalid(`${path}.campaignWindow`);
  }

  return {
    trackId,
    trackTitle: string(item.trackTitle, `${path}.trackTitle`),
    coverArtUrl: nullableHttpUrl(item.coverArtUrl, `${path}.coverArtUrl`),
    artists,
    campaignCount,
    campaignStatusCounts: parseStatusCounts(
      item.campaignStatusCounts,
      campaignCount,
      `${path}.campaignStatusCounts`,
    ),
    firstCampaignAtUtc,
    latestCampaignAtUtc,
  };
}

export function parsePaidPromotionSubjects(
  value: unknown,
  path = 'subjects',
): PaidPromotionSubject[] {
  if (!Array.isArray(value)) invalid(path);
  return value.map((subject, index) => parsePaidPromotionSubject(subject, `${path}[${index}]`));
}
