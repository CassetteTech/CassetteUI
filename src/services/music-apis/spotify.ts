import './server-only';
import { serverConfig } from '@/lib/config-server';
import { MusicSearchResult } from '@/types';
import { appLogger } from '@/lib/observability/logger';
import { 
  SpotifySearchResponse,
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAlbum
} from '@/types/music-api';

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
}

class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiryTime: Date | null = null;

  private getConfig(): SpotifyConfig {
    const clientId = serverConfig.spotify.clientId;
    const clientSecret = serverConfig.spotify.clientSecret;

    if (!clientId || !clientSecret) {
      const missing = [];
      if (!clientId) missing.push('SPOTIFY_CLIENT_ID');
      if (!clientSecret) missing.push('SPOTIFY_CLIENT_SECRET');
      
      appLogger.error('spotify_credentials_missing', { missing });
      throw new Error(`Spotify credentials not configured. Missing: ${missing.join(', ')}`);
    }

    return { clientId, clientSecret };
  }

  private async getAccessToken(): Promise<string> {
    // Use cached token if valid with 5 minute buffer
    if (this.accessToken && this.tokenExpiryTime) {
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute buffer
      if (this.tokenExpiryTime > bufferTime) {
        appLogger.debug('spotify_token_cache_hit');
        return this.accessToken;
      }
    }

    const { clientId, clientSecret } = this.getConfig();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const startTime = Date.now();
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const elapsedTime = Date.now() - startTime;

    if (!response.ok) {
      await response.body?.cancel();
      appLogger.error('spotify_token_request_failed', {
        status: response.status,
        duration_ms: elapsedTime,
      });
      throw new Error(`Failed to get Spotify access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Use actual expiry time from response with small safety buffer
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiryTime = new Date(Date.now() + (expiresIn - 60) * 1000);
    
    appLogger.debug('spotify_token_request_succeeded', { duration_ms: elapsedTime });
    
    if (!this.accessToken) {
      appLogger.error('spotify_token_missing_in_response');
      throw new Error('Failed to obtain access token from Spotify');
    }
    
    return this.accessToken;
  }

  async search(query: string): Promise<MusicSearchResult> {
    appLogger.debug('spotify_search_started');
    const startTime = Date.now();
    
    let token: string;
    try {
      token = await this.getAccessToken();
    } catch (error) {
      appLogger.error('spotify_token_for_search_failed', { error });
      throw error;
    }
    
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'track,artist,album');
    url.searchParams.append('limit', '10');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsedTime = Date.now() - startTime;

    if (!response.ok) {
      await response.body?.cancel();
      appLogger.error('spotify_search_failed', {
        status: response.status,
        duration_ms: elapsedTime,
      });
      throw new Error(`Failed to search Spotify: ${response.status} ${response.statusText}`);
    }

    appLogger.debug('spotify_search_succeeded', {
      status: response.status,
      duration_ms: elapsedTime,
    });

    const data = await response.json();
    return this.transformSearchResults(data);
  }

  /**
   * Search for a track by ISRC and return its preview URL.
   * Falls back to searching by track title + artist if ISRC search fails.
   */
  async getPreviewUrl(params: { isrc?: string; title?: string; artist?: string }): Promise<string | null> {
    appLogger.debug('spotify_preview_lookup_started', {
      has_isrc: Boolean(params.isrc),
      has_title: Boolean(params.title),
      has_artist: Boolean(params.artist),
    });

    const token = await this.getAccessToken();
    const url = new URL('https://api.spotify.com/v1/search');

    // Try ISRC search first (most accurate)
    if (params.isrc) {
      url.searchParams.set('q', `isrc:${params.isrc}`);
      url.searchParams.set('type', 'track');
      url.searchParams.set('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const track = data.tracks?.items?.[0];
        if (track?.preview_url) {
          return track.preview_url;
        }
        appLogger.debug('spotify_isrc_preview_unavailable');
      }
    }

    // Fallback to title + artist search - try simple query first (more flexible)
    if (params.title) {
      // Simple search: "title artist" works better than track:/artist: filters
      const query = params.artist
        ? `${params.title} ${params.artist}`
        : params.title;

      url.searchParams.set('q', query);
      url.searchParams.set('type', 'track');
      url.searchParams.set('limit', '10');
      // Add market parameter - may help with preview availability
      url.searchParams.set('market', 'US');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const totalTracks = data.tracks?.items?.length || 0;
        appLogger.debug('spotify_title_preview_candidates_loaded', { result_count: totalTracks });

        // Find the first track with a preview URL
        const trackWithPreview = data.tracks?.items?.find((t: SpotifyTrack) => t.preview_url);
        if (trackWithPreview?.preview_url) {
          return trackWithPreview.preview_url;
        }
        appLogger.debug('spotify_title_preview_unavailable');
      } else {
        await response.body?.cancel();
        appLogger.warn('spotify_preview_search_failed', { status: response.status });
      }
    }

    appLogger.debug('spotify_preview_not_found');
    return null;
  }

  /**
   * Fetch a track directly by Spotify track ID and return its preview URL.
   * This uses the direct track endpoint which may still return preview URLs
   * even though the search endpoint no longer does.
   */
  async getPreviewByTrackId(trackId: string): Promise<string | null> {
    appLogger.debug('spotify_track_preview_lookup_started');

    try {
      const token = await this.getAccessToken();
      const url = `https://api.spotify.com/v1/tracks/${trackId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        await response.body?.cancel();
        appLogger.warn('spotify_track_fetch_failed', { status: response.status });
        return null;
      }

      const track = await response.json();

      if (track.preview_url) {
        return track.preview_url;
      }

      appLogger.debug('spotify_track_preview_unavailable');
      return null;
    } catch (error) {
      appLogger.warn('spotify_track_preview_lookup_failed', { error });
      return null;
    }
  }

  private transformSearchResults(data: SpotifySearchResponse): MusicSearchResult {
    const results: MusicSearchResult = {
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
    };

    // Transform tracks
    if (data.tracks?.items) {
      results.tracks = data.tracks.items.map((item: SpotifyTrack) => ({
        id: item.id,
        title: item.name,
        artist: item.artists[0]?.name || 'Unknown Artist',
        album: item.album.name,
        artwork: item.album.images[0]?.url || '',
        duration: item.duration_ms,
        previewUrl: item.preview_url,
        isExplicit: item.explicit,
        externalUrls: {
          spotify: item.external_urls.spotify,
        },
      }));
    }

    // Transform artists
    if (data.artists?.items) {
      results.artists = data.artists.items.map((item: SpotifyArtist) => ({
        id: item.id,
        name: item.name,
        artwork: item.images[0]?.url || '',
        genres: item.genres || [],
        externalUrls: {
          spotify: item.external_urls.spotify,
        },
      }));
    }

    // Transform albums
    if (data.albums?.items) {
      results.albums = data.albums.items.map((item: SpotifyAlbum) => ({
        id: item.id,
        title: item.name,
        artist: item.artists[0]?.name || 'Unknown Artist',
        artwork: item.images[0]?.url || '',
        releaseDate: item.release_date,
        trackCount: item.total_tracks,
        externalUrls: {
          spotify: item.external_urls.spotify,
        },
      }));
    }

    return results;
  }
}

export const spotifyService = new SpotifyService();
