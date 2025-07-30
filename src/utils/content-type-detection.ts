import { ContentType } from '@/hooks/use-simulated-progress';

export interface ContentInfo {
  type: ContentType;
  estimatedCount: number;
  platform: 'spotify' | 'apple' | 'deezer' | 'unknown';
  id: string;
}

export const detectContentType = (url: string, metadata?: Record<string, unknown> | null): ContentInfo => {
  let type: ContentType = 'track';
  let estimatedCount = 1;
  let platform: 'spotify' | 'apple' | 'deezer' | 'unknown' = 'unknown';
  let id = '';

  // Platform detection
  if (/(?:open|play)\.spotify\.com/i.test(url)) {
    platform = 'spotify';
  } else if (/music\.apple\.com/i.test(url)) {
    platform = 'apple';
  } else if (/(?:www\.)?deezer\.com/i.test(url)) {
    platform = 'deezer';
  }

  // Spotify URL parsing
  if (platform === 'spotify') {
    if (/\/track\/([a-zA-Z0-9]+)/i.test(url)) {
      type = 'track';
      const match = url.match(/\/track\/([a-zA-Z0-9]+)/i);
      id = match?.[1] || '';
    } else if (/\/album\/([a-zA-Z0-9]+)/i.test(url)) {
      type = 'album';
      const match = url.match(/\/album\/([a-zA-Z0-9]+)/i);
      id = match?.[1] || '';
    } else if (/\/artist\/([a-zA-Z0-9]+)/i.test(url)) {
      type = 'artist';
      const match = url.match(/\/artist\/([a-zA-Z0-9]+)/i);
      id = match?.[1] || '';
    } else if (/\/playlist\/([a-zA-Z0-9]+)/i.test(url)) {
      type = 'playlist';
      const match = url.match(/\/playlist\/([a-zA-Z0-9]+)/i);
      id = match?.[1] || '';
    }
  }
  
  // Apple Music URL parsing
  else if (platform === 'apple') {
    // Track (song URL form): /song/name/id
    if (/\/song\/[^\/]+\/\d+/i.test(url)) {
      type = 'track';
      const match = url.match(/\/song\/[^\/]+\/(\d+)/i);
      id = match?.[1] || '';
    }
    // Track (album URL with ?i= form): /album/name/id?i=trackId
    else if (/\/album\/.*\?i=\d+/i.test(url)) {
      type = 'track';
      const match = url.match(/[?&]i=(\d+)/i);
      id = match?.[1] || '';
    }
    // Album: /album/name/id (without ?i=)
    else if (/\/album\/[^\/]+\/\d+(?:\?|$)/i.test(url)) {
      type = 'album';
      const match = url.match(/\/album\/(?:[^\/]+\/)?(\d+)(?:\?|$)/i);
      id = match?.[1] || '';
    }
    // Artist: /artist/name/id
    else if (/\/artist\/[^\/]+\/[0-9]+/i.test(url)) {
      type = 'artist';
      const match = url.match(/\/artist\/[^\/]+\/([0-9]+)/i);
      id = match?.[1] || '';
    }
    // Playlist: /playlist/name/pl.id
    else if (/\/playlist\/[^\/]+\/(pl\.(?:u-)?[a-zA-Z0-9\-]+)/i.test(url)) {
      type = 'playlist';
      const match = url.match(/\/playlist\/[^\/]+\/(pl\.(?:u-)?[a-zA-Z0-9\-]+)/i);
      id = match?.[1] || '';
    }
  }
  
  // Deezer URL parsing
  else if (platform === 'deezer') {
    if (/track\/(\d+)/i.test(url)) {
      type = 'track';
      const match = url.match(/track\/(\d+)/i);
      id = match?.[1] || '';
    } else if (/album\/(\d+)/i.test(url)) {
      type = 'album';
      const match = url.match(/album\/(\d+)/i);
      id = match?.[1] || '';
    } else if (/artist\/(\d+)/i.test(url)) {
      type = 'artist';
      const match = url.match(/artist\/(\d+)/i);
      id = match?.[1] || '';
    } else if (/playlist\/(\d+)/i.test(url)) {
      type = 'playlist';
      const match = url.match(/playlist\/(\d+)/i);
      id = match?.[1] || '';
    }
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
  switch (platform) {
    case 'spotify':
      return 'Spotify';
    case 'apple':
      return 'Apple Music';
    case 'deezer':
      return 'Deezer';
    default:
      return 'Music platform';
  }
};