import { ICON_PATHS } from './social-links';

// Additional brand glyphs from simple-icons (CC0); Instagram/TikTok/LinkedIn/Reddit
// come from the shared company-social set.
export const PLATFORM_ICON_PATHS: Record<string, string> = {
  ...ICON_PATHS,
  Spotify:
    'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  YouTube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  X: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
};

const HOST_PLATFORMS: Record<string, string> = {
  'instagram.com': 'Instagram',
  'tiktok.com': 'TikTok',
  'linkedin.com': 'LinkedIn',
  'reddit.com': 'Reddit',
  'open.spotify.com': 'Spotify',
  'spotify.com': 'Spotify',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'x.com': 'X',
  'twitter.com': 'X',
  'soundcloud.com': 'SoundCloud',
};

export interface ParsedProfileLink {
  href: string;
  /** Display name for known platforms, bare hostname otherwise. */
  platform: string;
  /** "@handle" when derivable from the URL path, else the platform name. */
  label: string;
  /** 24x24 currentColor SVG path; undefined falls back to a globe icon. */
  iconPath?: string;
}

export function parseProfileLink(url: string): ParsedProfileLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const platform = HOST_PLATFORMS[host] ?? host;
  const segments = parsed.pathname.split('/').filter(Boolean);
  // Skip container segments (youtube.com/c/x, spotify.com/user/x, reddit.com/user/x).
  const rawHandle = ['user', 'channel', 'c', 'u'].includes(segments[0] ?? '')
    ? segments[1]
    : segments[0];
  const handle = rawHandle ? `@${decodeURIComponent(rawHandle).replace(/^@/, '')}` : undefined;

  return {
    href: parsed.toString(),
    platform,
    label: handle ?? platform,
    iconPath: PLATFORM_ICON_PATHS[platform],
  };
}
