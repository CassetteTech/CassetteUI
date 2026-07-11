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

const DEEZER_REDIRECT_HOSTS = [
  'deezer.page.link',
  'dzr.page.link',
  'link.deezer.com',
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

function isDeezerRedirectUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    DEEZER_REDIRECT_HOSTS.some((domain) => hostname === domain) &&
    (hostname === 'link.deezer.com' ? pathSegments.length >= 2 : pathSegments.length >= 1)
  );
}

export function normalizeMusicLinkInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Support pasted share text that includes a URL in the middle of a sentence.
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  return (urlMatch ? urlMatch[0] : trimmed).trim();
}

export function isSupportedMusicLink(raw: string): boolean {
  const normalized = normalizeMusicLinkInput(raw);
  const parsedUrl = getParsedUrl(normalized);
  if (!parsedUrl || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
    return false;
  }
  if (isDeezerRedirectUrl(parsedUrl)) {
    return true;
  }

  const detected = detectContentType(normalized);
  return detected.platform !== 'unknown' && detected.id.length > 0;
}

export function getMusicSourceLabel(raw: string): 'Spotify' | 'Apple Music' | 'Deezer' | 'unknown' {
  const normalized = normalizeMusicLinkInput(raw);
  const parsedUrl = getParsedUrl(normalized);
  if (parsedUrl && isDeezerRedirectUrl(parsedUrl)) {
    return 'Deezer';
  }

  const displayName = getPlatformDisplayName(detectContentType(normalized).platform);
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

  if (!/^https?:\/\//i.test(normalized)) {
    if (
      /^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ||
      normalized.includes('.com') ||
      normalized.toLowerCase().includes('http') ||
      normalized.toLowerCase().includes('www')
    ) {
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

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return 'Please enter a valid URL starting with http:// or https://';
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
    // Bridge resolves these redirect links before extracting the Deezer ID.
    if (isDeezerRedirectUrl(parsedUrl)) {
      return null;
    }

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

  return `This music service isn't supported yet. Please use a link from ${supportedServices}.`;
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
