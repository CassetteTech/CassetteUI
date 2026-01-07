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
      const { developerToken } = await apiService.getAppleMusicDeveloperToken();

      // Configure MusicKit
      await (window as unknown as MusicKitWindow).MusicKit.configure({
        developerToken,
        app: { name: 'Cassette', build: '1.0.0' },
      });

      const instance = (window as unknown as MusicKitWindow).MusicKit.getInstance();

      // Clear any cached authorization to force fresh consent
      // This ensures the user explicitly authorizes THIS Cassette account
      if (instance.isAuthorized) {
        await instance.unauthorize();
      }

      // Authorize user (shows Apple Music modal)
      const musicUserToken = await instance.authorize();

      if (musicUserToken) {
        // Send token to backend to save connection
        const response = await apiService.connectAppleMusic(musicUserToken);
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
