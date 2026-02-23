import type { AnalyticsBaseProps, ElementTypeDimension, PlatformDimension } from './events';

const MAX_STRING_LENGTH = 180;

const FORBIDDEN_KEY_PATTERNS = [
  /description/i,
  /bio/i,
  /name/i,
  /email/i,
  /message/i,
  /body/i,
  /notes?/i,
  /source_link/i,
  /url$/i,
  /pageurl/i,
  /title/i,
  /artist/i,
  /album/i,
  /query/i,
];

const ALLOWED_KEYS = new Set<keyof AnalyticsBaseProps>([
  'element_type',
  'source_platform',
  'target_platform',
  'source_surface',
  'route',
  'is_authenticated',
  'user_id',
  'organization_id',
  'role',
  'plan',
  'post_id',
  'music_element_id',
  'status',
  'success',
  'core_action',
  'reason_code',
  'source_domain',
  'element_type_guess',
  'report_type',
  'source_context',
  'has_description',
  'has_conversion_context',
  'platform_count',
  'result_count',
  'step',
  'service',
  'account_type',
  'internal_actor',
]);

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown): string | boolean | number | undefined {
  if (value == null) return undefined;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.length > MAX_STRING_LENGTH ? trimmed.slice(0, MAX_STRING_LENGTH) : trimmed;
  }

  return undefined;
}

export function sanitizeRoute(route: unknown): string | undefined {
  if (typeof route !== 'string') return undefined;
  const trimmed = route.trim();
  if (!trimmed) return undefined;

  try {
    const maybeUrl = new URL(trimmed);
    return maybeUrl.pathname;
  } catch {
    const pathOnly = trimmed.split('?')[0].split('#')[0];
    if (!pathOnly.startsWith('/')) {
      return `/${pathOnly}`;
    }
    return pathOnly;
  }
}

export function sanitizeDomain(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  try {
    const fromUrl = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return fromUrl.hostname.toLowerCase();
  } catch {
    const withoutProto = trimmed.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    return withoutProto || undefined;
  }
}

export function normalizePlatform(value: unknown): PlatformDimension | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase().replace(/[\s_-]/g, '');
  if (!normalized) return undefined;

  if (normalized === 'spotify') return 'spotify';
  if (normalized === 'apple' || normalized === 'applemusic') return 'apple';
  if (normalized === 'deezer') return 'deezer';
  return 'unknown';
}

export function normalizeElementType(value: unknown): ElementTypeDimension | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'track' || normalized === 'album' || normalized === 'artist' || normalized === 'playlist') {
    return normalized;
  }
  return undefined;
}

export function sanitizeAnalyticsProps(input: Partial<AnalyticsBaseProps>): Partial<AnalyticsBaseProps> {
  const sanitized: Partial<AnalyticsBaseProps> = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (isForbiddenKey(rawKey)) continue;

    const key = rawKey as keyof AnalyticsBaseProps;
    if (!ALLOWED_KEYS.has(key)) continue;

    if (key === 'route') {
      const route = sanitizeRoute(rawValue);
      if (route) sanitized.route = route;
      continue;
    }

    if (key === 'source_domain') {
      const domain = sanitizeDomain(rawValue);
      if (domain) sanitized.source_domain = domain;
      continue;
    }

    if (key === 'source_platform') {
      const platform = normalizePlatform(rawValue);
      if (platform) sanitized.source_platform = platform;
      continue;
    }

    if (key === 'target_platform') {
      const platform = normalizePlatform(rawValue);
      if (platform) sanitized.target_platform = platform;
      continue;
    }

    if (key === 'service') {
      const platform = normalizePlatform(rawValue);
      if (platform) sanitized.service = platform;
      continue;
    }

    if (key === 'element_type') {
      const elementType = normalizeElementType(rawValue);
      if (elementType) sanitized.element_type = elementType;
      continue;
    }

    if (key === 'element_type_guess') {
      const elementType = normalizeElementType(rawValue);
      if (elementType) sanitized.element_type_guess = elementType;
      continue;
    }

    const value = sanitizeValue(rawValue);
    if (value === undefined) continue;

    (sanitized as Record<string, unknown>)[key] = value;
  }

  return sanitized;
}
