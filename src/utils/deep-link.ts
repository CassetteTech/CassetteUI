function getSpotifyAppUrl(webUrl: string): string | null {
  const spotifyMatch = webUrl.match(/open\.spotify\.com\/(\w+)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return `spotify:${spotifyMatch[1]}:${spotifyMatch[2]}`;
  }
  return null;
}

export function isAppleMusicLibraryUrl(url: string): boolean {
  return url.includes('music.apple.com') && url.includes('/library/');
}

function getAppleMusicAppUrl(webUrl: string): string | null {
  if (!webUrl.includes('music.apple.com')) return null;

  // Library playlists (p.xxx IDs) don't support deep linking - return null to open in browser
  if (isAppleMusicLibraryUrl(webUrl)) {
    return null;
  }

  // Public catalog URLs (pl.u-xxx IDs) - these work with Universal Links
  // Format: https://music.apple.com/us/playlist/{name}/{id}
  // No conversion needed - Universal Links will handle it
  return null;
}

function isAppleMusicUrl(url: string): boolean {
  return url.includes('music.apple.com');
}

interface AnchorClickLike {
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
  preventDefault(): void;
}

export function handleStreamingLinkClick(event: AnchorClickLike, url: string): void {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }

  if (!getSpotifyAppUrl(url)) {
    return;
  }

  event.preventDefault();
  openInAppOrBrowser(url);
}

export function openInAppOrBrowser(webUrl: string): void {
  if (typeof window === 'undefined') return;

  if (isAppleMusicUrl(webUrl)) {
    const appleMusicAppUrl = getAppleMusicAppUrl(webUrl);

    if (appleMusicAppUrl) {
      const timeout = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.open(webUrl, '_blank', 'noopener,noreferrer');
        }
      }, 1500);

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('blur', cleanup);
        document.removeEventListener('visibilitychange', cleanup);
      };

      window.addEventListener('blur', cleanup);
      document.addEventListener('visibilitychange', cleanup);

      window.location.href = appleMusicAppUrl;
      return;
    }

    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const spotifyAppUrl = getSpotifyAppUrl(webUrl);

  if (!spotifyAppUrl) {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Set up fallback timeout - if page stays visible, app didn't open
  const timeout = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }, 1500);

  const cleanup = () => {
    clearTimeout(timeout);
    window.removeEventListener('blur', cleanup);
    document.removeEventListener('visibilitychange', cleanup);
  };

  window.addEventListener('blur', cleanup);
  document.addEventListener('visibilitychange', cleanup);

  window.location.href = spotifyAppUrl;
}
