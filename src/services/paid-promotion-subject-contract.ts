import type {
  PaidPromotionCampaignStatus,
  PaidPromotionSubject,
} from '@/types';

/**
 * Boundary mapping for the promoter subjects catalog. Verifies only the shape
 * the UI renders; unknown status keys and additive fields pass through so
 * backend changes never brick the promote pages. Rollup arithmetic is audited
 * server-side, not here.
 */

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
  if (value === null || value === undefined) return null;
  const result = string(value, path);

  // Rendered into an image src; refuse non-http(s) schemes at the boundary.
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

function parseStatusCounts(
  value: unknown,
  path: string,
): Partial<Record<PaidPromotionCampaignStatus, number>> {
  const item = record(value, path);
  const result: Partial<Record<PaidPromotionCampaignStatus, number>> = {};

  for (const [status, countValue] of Object.entries(item)) {
    result[status as PaidPromotionCampaignStatus] = integer(countValue, `${path}.${status}`);
  }

  return result;
}

export function parsePaidPromotionSubject(
  value: unknown,
  path = 'subject',
): PaidPromotionSubject {
  const item = record(value, path);

  if (!Array.isArray(item.artists)) invalid(`${path}.artists`);
  const artists = item.artists.map((artist, index) =>
    string(artist, `${path}.artists[${index}]`)
  );

  return {
    trackId: string(item.trackId, `${path}.trackId`),
    trackTitle: string(item.trackTitle, `${path}.trackTitle`),
    coverArtUrl: nullableHttpUrl(item.coverArtUrl, `${path}.coverArtUrl`),
    artists,
    campaignCount: integer(item.campaignCount, `${path}.campaignCount`),
    campaignStatusCounts: parseStatusCounts(
      item.campaignStatusCounts,
      `${path}.campaignStatusCounts`,
    ),
    firstCampaignAtUtc: string(item.firstCampaignAtUtc, `${path}.firstCampaignAtUtc`),
    latestCampaignAtUtc: string(item.latestCampaignAtUtc, `${path}.latestCampaignAtUtc`),
  };
}

export function parsePaidPromotionSubjects(
  value: unknown,
  path = 'subjects',
): PaidPromotionSubject[] {
  if (!Array.isArray(value)) invalid(path);
  return value.map((subject, index) => parsePaidPromotionSubject(subject, `${path}[${index}]`));
}
