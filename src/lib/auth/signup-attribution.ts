export const SIGNUP_ATTRIBUTION_COOKIE_NAME = 'cassette_attribution';
export const SIGNUP_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const SIGNUP_SOURCE_MAX_LENGTH = 100;
const SIGNUP_MEDIUM_MAX_LENGTH = 100;
const SIGNUP_CAMPAIGN_MAX_LENGTH = 150;
const FIRST_REFERRER_DOMAIN_MAX_LENGTH = 255;

export type SignupAttribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  firstReferrerDomain?: string;
  capturedAt?: string;
};

function normalizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export function normalizeDomain(value: unknown, maxLength = FIRST_REFERRER_DOMAIN_MAX_LENGTH): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const hostname = parsed.hostname.toLowerCase();
    return hostname.length > maxLength ? hostname.slice(0, maxLength) : hostname;
  } catch {
    return undefined;
  }
}

export function normalizeSignupAttribution(
  input: Partial<SignupAttribution> | null | undefined,
): SignupAttribution | null {
  if (!input) {
    return null;
  }

  const normalized: SignupAttribution = {
    source: normalizeString(input.source, SIGNUP_SOURCE_MAX_LENGTH),
    medium: normalizeString(input.medium, SIGNUP_MEDIUM_MAX_LENGTH),
    campaign: normalizeString(input.campaign, SIGNUP_CAMPAIGN_MAX_LENGTH),
    firstReferrerDomain: normalizeDomain(input.firstReferrerDomain),
    capturedAt: normalizeTimestamp(input.capturedAt),
  };

  if (
    !normalized.source &&
    !normalized.medium &&
    !normalized.campaign &&
    !normalized.firstReferrerDomain &&
    !normalized.capturedAt
  ) {
    return null;
  }

  return normalized;
}

export function extractSignupAttributionFromUrl(
  url: URL,
  referer?: string | null,
): SignupAttribution | null {
  const source = url.searchParams.get('src') || url.searchParams.get('utm_source');
  const medium = url.searchParams.get('utm_medium');
  const campaign = url.searchParams.get('utm_campaign');

  if (!source && !medium && !campaign) {
    return null;
  }

  return normalizeSignupAttribution({
    source: source ?? undefined,
    medium: medium ?? undefined,
    campaign: campaign ?? undefined,
    firstReferrerDomain: normalizeDomain(referer),
    capturedAt: new Date().toISOString(),
  });
}

export function parseSignupAttributionCookie(value: string | null | undefined): SignupAttribution | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SignupAttribution>;
    return normalizeSignupAttribution(parsed);
  } catch {
    return null;
  }
}

export function serializeSignupAttributionCookie(attribution: SignupAttribution): string {
  return encodeURIComponent(JSON.stringify(attribution));
}
