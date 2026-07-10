import type { ContentType } from '../hooks/use-simulated-progress';
import {
  type PlatformAnalyticsKey,
  getPlatformDefinition,
  getPlatformDefinitionForHostname,
} from '../lib/platforms';

export interface ContentInfo {
  type: ContentType;
  estimatedCount: number;
  platform: PlatformAnalyticsKey | 'unknown';
  id: string;
}

const CONTENT_TYPES = ['track', 'album', 'artist', 'playlist'] as const;

function getUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function getPathSegments(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

function getSegmentAfter(segments: string[], marker: string, offset = 1): string {
  const index = segments.findIndex((segment) => segment.toLowerCase() === marker);
  return index >= 0 ? segments[index + offset] ?? '' : '';
}

function parseSpotify(url: URL): Pick<ContentInfo, 'type' | 'id'> {
  const segments = getPathSegments(url);
  const typeSegment = segments.find((segment) =>
    CONTENT_TYPES.includes(segment.toLowerCase() as ContentType),
  );
  const type = typeSegment?.toLowerCase() as ContentType | undefined;

  if (!type) {
    return { type: 'track', id: '' };
  }

  return { type, id: getSegmentAfter(segments, type) };
}

function parseAppleMusic(url: URL): Pick<ContentInfo, 'type' | 'id'> {
  const segments = getPathSegments(url);
  const trackId = url.searchParams.get('i');
  if (trackId) {
    return { type: 'track', id: trackId };
  }

  if (segments.some((segment) => segment.toLowerCase() === 'song')) {
    return { type: 'track', id: getSegmentAfter(segments, 'song', 2) };
  }

  if (segments.some((segment) => segment.toLowerCase() === 'album')) {
    return { type: 'album', id: getSegmentAfter(segments, 'album', 2) };
  }

  if (segments.some((segment) => segment.toLowerCase() === 'artist')) {
    return { type: 'artist', id: getSegmentAfter(segments, 'artist', 2) };
  }

  if (segments.some((segment) => segment.toLowerCase() === 'playlist')) {
    return { type: 'playlist', id: getSegmentAfter(segments, 'playlist', 2) };
  }

  return { type: 'track', id: '' };
}

function parseDeezer(url: URL): Pick<ContentInfo, 'type' | 'id'> {
  const segments = getPathSegments(url);
  const typeSegment = segments.find((segment) =>
    CONTENT_TYPES.includes(segment.toLowerCase() as ContentType),
  );
  const type = typeSegment?.toLowerCase() as ContentType | undefined;

  if (!type) {
    return { type: 'track', id: '' };
  }

  return { type, id: getSegmentAfter(segments, type) };
}

export const detectContentType = (url: string, metadata?: Record<string, unknown> | null): ContentInfo => {
  let type: ContentType = 'track';
  let estimatedCount = 1;
  let platform: PlatformAnalyticsKey | 'unknown' = 'unknown';
  let id = '';
  const parsedUrl = getUrl(url);
  const platformDefinition = parsedUrl ? getPlatformDefinitionForHostname(parsedUrl.hostname) : null;

  if (parsedUrl && platformDefinition) {
    platform = platformDefinition.analyticsKey;
    const parsed =
      platformDefinition.analyticsKey === 'spotify'
        ? parseSpotify(parsedUrl)
        : platformDefinition.analyticsKey === 'apple'
          ? parseAppleMusic(parsedUrl)
          : parseDeezer(parsedUrl);
    type = parsed.type;
    id = parsed.id;
  }

  // Use metadata if available to override or supplement URL detection
  if (metadata?.type && typeof metadata.type === 'string') {
    type = metadata.type.toLowerCase() as ContentType;
  }

  // Estimate content count based on type
  estimatedCount = getEstimatedCount(type, metadata);

  return {
    type,
    estimatedCount,
    platform,
    id
  };
};

export const getEstimatedCount = (type: ContentType, metadata?: Record<string, unknown> | null): number => {
  if (metadata?.trackCount && typeof metadata.trackCount === 'number') {
    return metadata.trackCount;
  }

  // Default estimates based on content type
  switch (type) {
    case 'track':
      return 1;
    case 'album':
      return Math.floor(Math.random() * 8) + 8; // 8-15 tracks typical
    case 'artist':
      return Math.floor(Math.random() * 20) + 10; // 10-30 top tracks
    case 'playlist':
      return Math.floor(Math.random() * 40) + 20; // 20-60 tracks typical
    default:
      return 1;
  }
};

export const getContentTypeDisplayName = (type: ContentType): string => {
  switch (type) {
    case 'track':
      return 'track';
    case 'album':
      return 'album';
    case 'artist':
      return 'artist';
    case 'playlist':
      return 'playlist';
    default:
      return 'content';
  }
};

export const getContentTypeEmoji = (type: ContentType): string => {
  switch (type) {
    case 'track':
      return '🎵';
    case 'album':
      return '💿';
    case 'artist':
      return '🎤';
    case 'playlist':
      return '📋';
    default:
      return '🎶';
  }
};

export const getPlatformDisplayName = (platform: string): string => {
  return getPlatformDefinition(platform)?.displayName ?? 'Music platform';
};
