/**
 * Deep linking utility for opening music platform links in native apps
 * Falls back to browser if the app is not installed
 */

/**
 * Convert Spotify web URLs to app URL scheme
 * Apple Music uses Universal Links so we don't convert those
 */
function getSpotifyAppUrl(webUrl: string): string | null {
  // Spotify: https://open.spotify.com/playlist/xyz -> spotify:playlist:xyz
  const spotifyMatch = webUrl.match(/open\.spotify\.com\/(\w+)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return `spotify:${spotifyMatch[1]}:${spotifyMatch[2]}`;
  }
  return null;
}

/**
 * Check if this is an Apple Music library URL (vs public catalog URL)
 * Library URLs use /library/ path and don't support deep linking well
 */
export function isAppleMusicLibraryUrl(url: string): boolean {
  return url.includes('music.apple.com') && url.includes('/library/');
}

/**
 * Convert Apple Music PUBLIC URLs to app URL scheme
 * Public URLs like /us/playlist/{name}/{id} work with Universal Links
 * Library URLs (/library/playlist/{id}) don't support deep linking - must open in browser
 */
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

/**
 * Check if URL is an Apple Music URL
 */
function isAppleMusicUrl(url: string): boolean {
  return url.includes('music.apple.com');
}

/**
 * Anchor click events from React or the DOM — only the fields we inspect.
 */
interface AnchorClickLike {
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
  preventDefault(): void;
}

/**
 * Click handler for streaming-platform anchors (`<a target="_blank">`).
 *
 * Intercepts a plain left-click only when the URL has a native app scheme
 * (Spotify) and routes it through openInAppOrBrowser, so the app opens when
 * installed and the web fallback lands in a new tab either way. Modified
 * clicks (cmd/ctrl/shift/middle) and platforms without an app scheme keep
 * the anchor's native new-tab behavior — Apple Music relies on Universal
 * Links, so a plain new-tab open already hands off to the app.
 */
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

/**
 * Open URL in native app if available, otherwise fallback to browser.
 * Never navigates the current tab: app attempts use URL schemes (which
 * leave the page in place) and every web fallback opens in a new tab.
 *
 * - Spotify: Uses spotify: URL scheme with visibility-based fallback
 * - Apple Music library: Uses music:// URL scheme with fallback
 * - Apple Music catalog: Opens directly (Universal Links handle it)
 * - Others: Opens in browser
 */
export function openInAppOrBrowser(webUrl: string): void {
  if (typeof window === 'undefined') return;

  // Apple Music handling
  if (isAppleMusicUrl(webUrl)) {
    const appleMusicAppUrl = getAppleMusicAppUrl(webUrl);

    // Library URLs need app URL scheme
    if (appleMusicAppUrl) {
      // Try app URL with fallback
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

    // Public catalog URLs - let Universal Links handle it
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Spotify: Try app URL scheme with fallback
  const spotifyAppUrl = getSpotifyAppUrl(webUrl);

  if (!spotifyAppUrl) {
    // Not a recognized platform, open in browser
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Set up fallback timeout - if page stays visible, app didn't open
  const timeout = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }, 1500);

  // Cancel fallback if app opens (page loses focus)
  const cleanup = () => {
    clearTimeout(timeout);
    window.removeEventListener('blur', cleanup);
    document.removeEventListener('visibilitychange', cleanup);
  };

  window.addEventListener('blur', cleanup);
  document.addEventListener('visibilitychange', cleanup);

  // Attempt to open Spotify app
  window.location.href = spotifyAppUrl;
}
