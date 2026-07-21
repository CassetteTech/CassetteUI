export const PLATFORM_KEYS = {
  spotify: 'spotify',
  appleMusic: 'applemusic',
  deezer: 'deezer',
} as const;

export type PlatformKey = typeof PLATFORM_KEYS[keyof typeof PLATFORM_KEYS];
export type PlatformUiKey = 'spotify' | 'appleMusic' | 'deezer';
export type PlatformPreferenceKey = 'Spotify' | 'AppleMusic' | 'Deezer';
export type PlatformAnalyticsKey = 'spotify' | 'apple' | 'deezer';
export type PlatformDisplayKey = PlatformUiKey | 'tidal' | 'youtubeMusic';

export interface PlatformDefinition {
  key: PlatformKey;
  uiKey: PlatformUiKey;
  preferenceKey: PlatformPreferenceKey;
  analyticsKey: PlatformAnalyticsKey;
  displayName: string;
  aliases: readonly string[];
  sourceHosts: readonly string[];
  logoSrc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  solidBgColor: string;
  profileBadgeClassName: string;
  requiresAuthForPlaylistCreation: boolean;
  connectionDescription: string;
  onboardingDescription: string;
}

export interface DisplayPlatformDefinition {
  uiKey: PlatformDisplayKey;
  displayName: string;
  aliases: readonly string[];
  logoSrc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  solidBgColor: string;
  profileBadgeClassName: string;
  active: boolean;
}

export interface MatchReviewProviderIdentity {
  platform: PlatformKey;
  providerId: string;
}

export const ACTIVE_PLATFORM_DEFINITIONS = [
  {
    key: PLATFORM_KEYS.spotify,
    uiKey: 'spotify',
    preferenceKey: 'Spotify',
    analyticsKey: 'spotify',
    displayName: 'Spotify',
    aliases: ['spotify'],
    sourceHosts: ['open.spotify.com', 'play.spotify.com'],
    logoSrc: '/images/spotify_logo_colored.png',
    color: 'hsl(var(--platform-spotify))',
    bgColor: 'bg-platform-spotify/10',
    borderColor: 'border-platform-spotify/40',
    solidBgColor: 'bg-platform-spotify',
    profileBadgeClassName: 'bg-platform-spotify/20 border-platform-spotify/50',
    requiresAuthForPlaylistCreation: false,
    connectionDescription: 'Share music and create playlists',
    onboardingDescription: 'Add Spotify to your profile',
  },
  {
    key: PLATFORM_KEYS.appleMusic,
    uiKey: 'appleMusic',
    preferenceKey: 'AppleMusic',
    analyticsKey: 'apple',
    displayName: 'Apple Music',
    aliases: ['apple', 'applemusic', 'apple_music', 'apple-music', 'apple music', 'am'],
    sourceHosts: ['music.apple.com'],
    logoSrc: '/images/apple_music_logo_colored.png',
    color: 'hsl(var(--platform-apple-music))',
    bgColor: 'bg-platform-apple-music/10',
    borderColor: 'border-platform-apple-music/40',
    solidBgColor: 'bg-platform-apple-music',
    profileBadgeClassName: 'bg-platform-apple-music/20 border-platform-apple-music/50',
    requiresAuthForPlaylistCreation: true,
    connectionDescription: 'Requires authorization for playlists',
    onboardingDescription: 'Connect to create playlists',
  },
  {
    key: PLATFORM_KEYS.deezer,
    uiKey: 'deezer',
    preferenceKey: 'Deezer',
    analyticsKey: 'deezer',
    displayName: 'Deezer',
    aliases: ['deezer'],
    sourceHosts: ['deezer.com', 'www.deezer.com', 'link.deezer.com', 'deezer.page.link', 'dzr.page.link'],
    logoSrc: '/images/deezer_logo_colored.png',
    color: 'hsl(var(--platform-deezer))',
    bgColor: 'bg-platform-deezer/10',
    borderColor: 'border-platform-deezer/40',
    solidBgColor: 'bg-platform-deezer',
    profileBadgeClassName: 'bg-platform-deezer/20 border-platform-deezer/50',
    requiresAuthForPlaylistCreation: true,
    connectionDescription: 'Connect to create playlists',
    onboardingDescription: 'Connect to create playlists',
  },
] as const satisfies readonly PlatformDefinition[];

const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:-]{1,200}$/;

export function extractMatchReviewProviderIdentity(rawUrl?: string): MatchReviewProviderIdentity | undefined {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    const definition = ACTIVE_PLATFORM_DEFINITIONS.find(platform =>
      platform.sourceHosts.some(host => host === url.hostname.toLowerCase()),
    );
    if (!definition) return undefined;

    const segments = url.pathname.split('/').filter(Boolean);
    let providerId: string | undefined;
    if (definition.key === PLATFORM_KEYS.appleMusic) {
      providerId = url.searchParams.get('i') || undefined;
      if (!providerId) {
        const typeIndex = segments.findIndex(segment => ['song', 'album', 'artist', 'playlist'].includes(segment));
        providerId = typeIndex >= 0 ? segments[segments.length - 1] : undefined;
      }
    } else {
      const typeIndex = segments.findIndex(segment => ['track', 'album', 'artist', 'playlist'].includes(segment));
      providerId = typeIndex >= 0 ? segments[typeIndex + 1] : undefined;
    }

    return providerId && SAFE_PROVIDER_ID.test(providerId)
      ? { platform: definition.key, providerId }
      : undefined;
  } catch {
    return undefined;
  }
}

const DISPLAY_ONLY_PLATFORM_DEFINITIONS = [
  {
    uiKey: 'tidal',
    displayName: 'Tidal',
    aliases: ['tidal'],
    logoSrc: '/images/social_images/ic_tidal.png',
    color: 'hsl(var(--platform-tidal))',
    bgColor: 'bg-platform-tidal/10',
    borderColor: 'border-platform-tidal/40',
    solidBgColor: 'bg-platform-tidal',
    profileBadgeClassName: 'bg-platform-tidal/20 border-platform-tidal/50',
    active: false,
  },
  {
    uiKey: 'youtubeMusic',
    displayName: 'YouTube Music',
    aliases: ['youtube', 'youtubemusic', 'youtube_music', 'youtube-music', 'youtube music'],
    logoSrc: '/images/social_images/ic_yt_music.png',
    color: 'hsl(var(--platform-youtube))',
    bgColor: 'bg-platform-youtube/10',
    borderColor: 'border-platform-youtube/40',
    solidBgColor: 'bg-platform-youtube',
    profileBadgeClassName: 'bg-platform-youtube/20 border-platform-youtube/50',
    active: false,
  },
] as const satisfies readonly DisplayPlatformDefinition[];

export const ACTIVE_PLATFORM_KEYS = ACTIVE_PLATFORM_DEFINITIONS.map((platform) => platform.key);
export const ACTIVE_PLATFORM_UI_KEYS = ACTIVE_PLATFORM_DEFINITIONS.map((platform) => platform.uiKey);
export const ACTIVE_PLATFORM_PREFERENCE_KEYS = ACTIVE_PLATFORM_DEFINITIONS.map((platform) => platform.preferenceKey);
export const PLAYLIST_CREATION_PLATFORM_UI_KEYS = ['spotify', 'appleMusic', 'deezer'] as const satisfies readonly PlatformUiKey[];

export const DISPLAY_PLATFORM_DEFINITIONS = [
  ...ACTIVE_PLATFORM_DEFINITIONS.map((platform) => ({
    uiKey: platform.uiKey,
    displayName: platform.displayName,
    aliases: platform.aliases,
    logoSrc: platform.logoSrc,
    color: platform.color,
    bgColor: platform.bgColor,
    borderColor: platform.borderColor,
    solidBgColor: platform.solidBgColor,
    profileBadgeClassName: platform.profileBadgeClassName,
    active: true,
  })),
  ...DISPLAY_ONLY_PLATFORM_DEFINITIONS,
] as const satisfies readonly DisplayPlatformDefinition[];

const normalizeAlias = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';

const activeByAlias = new Map<string, PlatformDefinition>();
const displayByAlias = new Map<string, DisplayPlatformDefinition>();
const activeByHost = new Map<string, PlatformDefinition>();

for (const platform of ACTIVE_PLATFORM_DEFINITIONS) {
  activeByAlias.set(normalizeAlias(platform.key), platform);
  activeByAlias.set(normalizeAlias(platform.uiKey), platform);
  activeByAlias.set(normalizeAlias(platform.preferenceKey), platform);
  activeByAlias.set(normalizeAlias(platform.analyticsKey), platform);
  for (const alias of platform.aliases) {
    activeByAlias.set(normalizeAlias(alias), platform);
  }
  for (const host of platform.sourceHosts) {
    activeByHost.set(host.toLowerCase(), platform);
  }
}

for (const platform of DISPLAY_PLATFORM_DEFINITIONS) {
  displayByAlias.set(normalizeAlias(platform.uiKey), platform);
  for (const alias of platform.aliases) {
    displayByAlias.set(normalizeAlias(alias), platform);
  }
}

export function normalizePlatformKey(value: unknown): PlatformKey | null {
  return activeByAlias.get(normalizeAlias(value))?.key ?? null;
}

export function normalizePlatformUiKey(value: unknown): PlatformUiKey | null {
  return activeByAlias.get(normalizeAlias(value))?.uiKey ?? null;
}

export function normalizePlatformPreferenceKey(value: unknown): PlatformPreferenceKey | null {
  return activeByAlias.get(normalizeAlias(value))?.preferenceKey ?? null;
}

export function normalizeDisplayPlatformKey(value: unknown): PlatformDisplayKey | null {
  return displayByAlias.get(normalizeAlias(value))?.uiKey ?? null;
}

export function getPlatformDefinition(value: unknown): PlatformDefinition | null {
  return activeByAlias.get(normalizeAlias(value)) ?? null;
}

export function getPlatformDefinitionForHostname(hostname: unknown): PlatformDefinition | null {
  if (typeof hostname !== 'string') {
    return null;
  }

  const normalizedHostname = hostname.trim().toLowerCase();
  for (const [sourceHost, platform] of activeByHost) {
    if (normalizedHostname === sourceHost || normalizedHostname.endsWith(`.${sourceHost}`)) {
      return platform;
    }
  }

  return null;
}

export function getDisplayPlatformDefinition(value: unknown): DisplayPlatformDefinition | null {
  return displayByAlias.get(normalizeAlias(value)) ?? null;
}

export function isAppleMusicPlatform(value: unknown): boolean {
  return normalizePlatformKey(value) === PLATFORM_KEYS.appleMusic;
}
