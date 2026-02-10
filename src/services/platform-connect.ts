/**
 * Service for initiating platform OAuth connections with return URL support.
 * Used when users need to connect a streaming platform from the playlist page.
 */

import { apiService } from './api';

interface MusicKitInstance {
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  isAuthorized: boolean;
}

interface MusicKitWindow {
  MusicKit: {
    configure: (config: unknown) => Promise<void>;
    getInstance: () => MusicKitInstance;
  };
}

export type PlatformKey = 'spotify' | 'appleMusic' | 'deezer';

const RETURN_URL_PREFIX = 'cassette_platform_return_url_';
const APPLE_AUTH_TIMEOUT_MS = 60_000;
const APPLE_BACKEND_SAVE_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export const platformConnectService = {
  /**
   * Initiate Spotify OAuth flow with return URL
   * Redirects in same tab (not new window) for cleaner UX
   */
  async connectSpotify(returnUrl?: string): Promise<void> {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    // Store return URL for callback to use
    if (returnUrl) {
      this.setReturnUrl('spotify', returnUrl);
    }

    const response = await fetch('/api/auth/spotify/connect', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Spotify auth URL');
    }

    const data = await response.json();

    if (data?.authUrl) {
      // Redirect in same tab for cleaner flow
      window.location.href = data.authUrl;
    } else {
      throw new Error('No auth URL received from server');
    }
  },

  /**
   * Initiate Apple Music authorization via MusicKit
   * Apple Music uses a modal flow, not a redirect
   */
  async connectAppleMusic(returnUrl?: string): Promise<boolean> {
    // Store return URL in case needed after modal
    if (returnUrl) {
      this.setReturnUrl('appleMusic', returnUrl);
    }

    try {
      const musicKit = (window as unknown as MusicKitWindow).MusicKit;
      if (!musicKit) {
        throw new Error('Apple Music SDK did not load. Please refresh and try again.');
      }

      const { developerToken } = await apiService.getAppleMusicDeveloperToken();

      // Configure MusicKit
      await musicKit.configure({
        developerToken,
        app: { name: 'Cassette', build: '1.0.0' },
      });

      const instance = musicKit.getInstance();

      // Authorize user (shows Apple Music modal)
      const musicUserToken = await withTimeout(
        instance.authorize(),
        APPLE_AUTH_TIMEOUT_MS,
        'Apple Music authorization timed out. Please try again.'
      );

      if (musicUserToken) {
        // Send token to backend to save connection
        const response = await withTimeout(
          apiService.connectAppleMusic(musicUserToken),
          APPLE_BACKEND_SAVE_TIMEOUT_MS,
          'Saving Apple Music connection timed out. Please try again.'
        );
        return response.success;
      }

      return false;
    } catch (error) {
      console.error('Apple Music connection error:', error);
      throw error;
    }
  },

  /**
   * Initiate Deezer OAuth flow
   * TODO: Implement when Deezer OAuth is available
   */
  async connectDeezer(returnUrl?: string): Promise<void> {
    if (returnUrl) {
      this.setReturnUrl('deezer', returnUrl);
    }
    // Deezer OAuth not yet implemented
    throw new Error('Deezer connection not yet implemented. Please connect via your profile settings.');
  },

  /**
   * Store return URL for a platform
   */
  setReturnUrl(platform: PlatformKey, url: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(`${RETURN_URL_PREFIX}${platform}`, url);
  },

  /**
   * Get stored return URL for a platform
   */
  getReturnUrl(platform: PlatformKey): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(`${RETURN_URL_PREFIX}${platform}`);
  },

  /**
   * Clear stored return URL for a platform
   */
  clearReturnUrl(platform: PlatformKey): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(`${RETURN_URL_PREFIX}${platform}`);
  },
};
