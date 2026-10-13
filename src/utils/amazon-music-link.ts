/**
 * Amazon Music link parsing (CAS-680).
 *
 * Pure functions with no UI wiring yet: the platform is not active in `src/lib/platforms.ts`
 * until the rollout gate exists, so nothing imports this module except its test. The rules
 * are the ones in `contract-fixtures/amazon-music/v1/amazon-music-link-matrix.v1.json`,
 * which CassetteBridge and MusicPlatformLambdas run as the same table.
 *
 * - Hosts match exactly after lowercasing and dropping a leading `www.`; never by suffix.
 * - The element type comes from the first path segment only, never from an id's shape.
 * - `trackAsin` on an album path turns the link into a track with the album as context.
 * - Only the element type and id are safe to log; never the full URL.
 */

export type AmazonMusicElementType = 'track' | 'album' | 'artist' | 'playlist';

export type AmazonMusicLinkErrorCode =
  | 'AMZ_UNSUPPORTED_HOST'
  | 'AMZ_STORE_LINK_UNSUPPORTED'
  | 'AMZ_UNSUPPORTED_PATH'
  | 'AMZ_UNSUPPORTED_CONTENT'
  | 'AMZ_INVALID_ID';

export interface ParsedAmazonMusicLink {
  elementType: AmazonMusicElementType;
  id: string;
  territoryHint: string;
  playlistKind?: 'curated' | 'user';
  context?: { albumId: string };
}

export type AmazonMusicLinkResult =
  | { ok: true; link: ParsedAmazonMusicLink }
  | { ok: false; code: AmazonMusicLinkErrorCode };

export const AMAZON_MUSIC_HOST_TERRITORIES = {
  'music.amazon.com': 'US',
  'music.amazon.co.uk': 'GB',
  'music.amazon.de': 'DE',
  'music.amazon.fr': 'FR',
  'music.amazon.it': 'IT',
  'music.amazon.es': 'ES',
  'music.amazon.co.jp': 'JP',
  'music.amazon.ca': 'CA',
  'music.amazon.com.au': 'AU',
  'music.amazon.com.br': 'BR',
  'music.amazon.com.mx': 'MX',
  'music.amazon.in': 'IN',
} as const satisfies Record<string, string>;

const HOST_TERRITORY_LOOKUP = new Map<string, string>(Object.entries(AMAZON_MUSIC_HOST_TERRITORIES));

export const AMAZON_MUSIC_HOSTS: readonly string[] = Object.keys(AMAZON_MUSIC_HOST_TERRITORIES);

const STORE_HOSTS = new Set([
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.co.jp',
  'amazon.ca',
  'amazon.com.au',
  'amazon.com.br',
  'amazon.com.mx',
  'amazon.in',
  'amzn.to',
  'a.co',
  'amzn.com',
  'amzn.eu',
  'amzn.asia',
]);

const ASIN_RE = /^B0[A-Z0-9]{8}$/;
// Provisional until CAS-673 observes real user-playlist ids.
const USER_PLAYLIST_ID_RE = /^[A-Za-z0-9]{20,64}$/;
const UNSUPPORTED_CONTENT_SEGMENTS = new Set(['podcasts', 'stations', 'live']);

const SEGMENT_TO_ELEMENT = new Map<string, AmazonMusicElementType>([
  ['tracks', 'track'],
  ['albums', 'album'],
  ['artists', 'artist'],
  ['playlists', 'playlist'],
  ['user-playlists', 'playlist'],
]);

/** Uppercases and validates an ASIN; returns `null` when it fails the rule. */
export function normalizeAmazonAsin(raw: string | null | undefined): string | null {
  let candidate = (raw ?? '').trim();
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return null;
  }
  candidate = candidate.toUpperCase();
  return ASIN_RE.test(candidate) ? candidate : null;
}

function normalizeHost(hostname: string): string {
  const host = hostname.toLowerCase();
  return host.startsWith('www.') ? host.slice(4) : host;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function parseAmazonMusicLink(rawUrl: string): AmazonMusicLinkResult {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed.includes('://')) {
    return { ok: false, code: 'AMZ_UNSUPPORTED_HOST' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, code: 'AMZ_UNSUPPORTED_HOST' };
  }

  const host = normalizeHost(url.hostname);
  if (STORE_HOSTS.has(host)) {
    return { ok: false, code: 'AMZ_STORE_LINK_UNSUPPORTED' };
  }
  const territoryHint = HOST_TERRITORY_LOOKUP.get(host);
  if (!territoryHint) {
    return { ok: false, code: 'AMZ_UNSUPPORTED_HOST' };
  }

  const segments = url.pathname.split('/').filter(Boolean).map(decodeSegment);
  if (segments.length === 0) {
    return { ok: false, code: 'AMZ_UNSUPPORTED_PATH' };
  }

  const head = segments[0].toLowerCase();
  if (UNSUPPORTED_CONTENT_SEGMENTS.has(head)) {
    return { ok: false, code: 'AMZ_UNSUPPORTED_CONTENT' };
  }
  const elementType = SEGMENT_TO_ELEMENT.get(head);
  if (!elementType || segments.length < 2) {
    return { ok: false, code: 'AMZ_UNSUPPORTED_PATH' };
  }

  const rawId = segments[1];

  if (head === 'user-playlists') {
    if (!USER_PLAYLIST_ID_RE.test(rawId)) {
      return { ok: false, code: 'AMZ_INVALID_ID' };
    }
    return { ok: true, link: { elementType: 'playlist', id: rawId, territoryHint, playlistKind: 'user' } };
  }

  const asin = normalizeAmazonAsin(rawId);
  if (!asin) {
    return { ok: false, code: 'AMZ_INVALID_ID' };
  }

  if (head === 'albums') {
    const trackParam = url.searchParams.get('trackAsin') ?? url.searchParams.get('trackasin');
    if (trackParam !== null) {
      const trackAsin = normalizeAmazonAsin(trackParam);
      if (!trackAsin) {
        return { ok: false, code: 'AMZ_INVALID_ID' };
      }
      return { ok: true, link: { elementType: 'track', id: trackAsin, territoryHint, context: { albumId: asin } } };
    }
    return { ok: true, link: { elementType: 'album', id: asin, territoryHint } };
  }

  if (head === 'playlists') {
    return { ok: true, link: { elementType: 'playlist', id: asin, territoryHint, playlistKind: 'curated' } };
  }

  return { ok: true, link: { elementType, id: asin, territoryHint } };
}

/** True when the hostname is an Amazon Music host (not the store). */
export function isAmazonMusicHostname(hostname: string): boolean {
  return HOST_TERRITORY_LOOKUP.has(normalizeHost(hostname));
}

/** Builds a music.amazon.com URL for an element when Bridge did not supply one. */
export function buildAmazonMusicUrl(
  elementType: AmazonMusicElementType,
  id: string,
  playlistKind?: 'curated' | 'user',
): string {
  if (elementType === 'playlist' && playlistKind === 'user') {
    return `https://music.amazon.com/user-playlists/${id}`;
  }
  const segment = { track: 'tracks', album: 'albums', artist: 'artists', playlist: 'playlists' }[elementType];
  return `https://music.amazon.com/${segment}/${id}`;
}
