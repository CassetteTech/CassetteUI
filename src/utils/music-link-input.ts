import type { SyntheticEvent } from 'react';
import { getPlatformDisplayName, detectContentType } from './content-type-detection';
import {
  ACTIVE_PLATFORM_DEFINITIONS,
  getPlatformDefinitionForHostname,
} from '../lib/platforms';

const UNSUPPORTED_MUSIC_HOSTS = [
  'youtube.com',
  'music.youtube.com',
  'youtu.be',
  'soundcloud.com',
  'bandcamp.com',
  'tidal.com',
  'amazon.com',
] as const;

const COMMON_NON_MUSIC_HOSTS = [
  'google.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
] as const;

function getParsedUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function hostnameIncludes(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function normalizeMusicLinkInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Support pasted share text that includes a URL in the middle of a sentence.
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  return (urlMatch ? urlMatch[0] : trimmed).trim();
}

export function isSupportedMusicLink(raw: string): boolean {
  const detected = detectContentType(normalizeMusicLinkInput(raw));
  return detected.platform !== 'unknown' && detected.id.length > 0;
}

export function getMusicSourceLabel(raw: string): 'Spotify' | 'Apple Music' | 'Deezer' | 'unknown' {
  const displayName = getPlatformDisplayName(detectContentType(normalizeMusicLinkInput(raw)).platform);
  return displayName === 'Music platform'
    ? 'unknown'
    : (displayName as 'Spotify' | 'Apple Music' | 'Deezer');
}

export function getSupportedMusicServiceList(): string {
  const names = ACTIVE_PLATFORM_DEFINITIONS.map((platform) => platform.displayName);
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`
    : names[0] ?? 'a supported music service';
}

export function validateMusicLink(raw: string): string | null {
  const normalized = normalizeMusicLinkInput(raw);
  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith('http')) {
    if (normalized.includes('.com') || normalized.includes('http') || normalized.includes('www')) {
      return 'Please enter a valid URL starting with http:// or https://';
    }
    return null;
  }

  const parsedUrl = getParsedUrl(normalized);
  if (!parsedUrl) {
    return normalized.includes('.com') || normalized.includes('http') || normalized.includes('www')
      ? 'Please enter a valid URL.'
      : null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const supportedServices = getSupportedMusicServiceList();

  if (hostnameIncludes(hostname, 'music.apple.com') && parsedUrl.pathname.includes('/library/')) {
    if (parsedUrl.pathname.includes('/library/playlist/')) {
      return "You've pasted a private Apple Music playlist link. Please use the 'Share Playlist' option to copy the correct link.";
    }
    return "You've pasted a private Apple Music library link. Please use the 'Share' option to copy the correct link.";
  }

  const platform = getPlatformDefinitionForHostname(hostname);
  if (platform) {
    const detected = detectContentType(normalized);
    if (!detected.id) {
      return `Please paste a ${platform.displayName} track, album, artist, or playlist link.`;
    }
    return null;
  }

  if (UNSUPPORTED_MUSIC_HOSTS.some((domain) => hostnameIncludes(hostname, domain))) {
    return `This music service isn't supported yet. Please use a link from ${supportedServices}.`;
  }

  if (normalized.length > 10 && COMMON_NON_MUSIC_HOSTS.some((domain) => hostnameIncludes(hostname, domain))) {
    return `This doesn't look like a music link or that service isn't supported yet. Please paste a link from ${supportedServices}.`;
  }

  return null;
}

export function isPasteLikeInputEvent(
  event: Event | InputEvent | SyntheticEvent<HTMLInputElement, Event>,
): boolean {
  const nativeEvent =
    'nativeEvent' in event ? (event.nativeEvent as InputEvent | Event) : event;
  const inputType =
    'inputType' in nativeEvent && typeof nativeEvent.inputType === 'string'
      ? nativeEvent.inputType
      : '';
  const insertedData =
    'data' in nativeEvent && typeof nativeEvent.data === 'string'
      ? nativeEvent.data
      : '';

  return (
    inputType === 'insertFromPaste' ||
    inputType === 'insertReplacementText' ||
    (inputType === 'insertText' && insertedData.length > 1)
  );
}
