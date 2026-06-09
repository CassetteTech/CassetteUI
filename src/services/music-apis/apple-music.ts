import './server-only';
import jwt from 'jsonwebtoken';
import { serverConfig } from '@/lib/config-server';
import { MusicSearchResult } from '@/types';
import { appLogger } from '@/lib/observability/logger';
import { 
  AppleMusicSearchResponse, 
  AppleMusicChartsResponse,
  AppleMusicSong,
  AppleMusicArtist,
  AppleMusicAlbum
} from '@/types/music-api';

interface AppleMusicConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
}

class AppleMusicService {
  private token: string | null = null;
  private tokenExpiryTime: Date | null = null;

  private getConfig(): AppleMusicConfig {
    const keyId = serverConfig.appleMusic.keyId;
    const teamId = serverConfig.appleMusic.teamId;
    const privateKey = serverConfig.appleMusic.privateKey;

    if (!keyId || !teamId || !privateKey) {
      const missing = [];
      if (!keyId) missing.push('APPLE_MUSIC_KEY_ID');
      if (!teamId) missing.push('APPLE_MUSIC_TEAM_ID');
      if (!privateKey) missing.push('APPLE_MUSIC_PRIVATE_KEY');
      
      appLogger.error('apple_music_credentials_missing', { missing });
      throw new Error(`Apple Music credentials not configured. Missing: ${missing.join(', ')}`);
    }

    return { keyId, teamId, privateKey };
  }

  private async getToken(): Promise<string> {
    // Use cached token if valid with 1 day buffer
    if (this.token && this.tokenExpiryTime) {
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day buffer
      if (this.tokenExpiryTime > bufferTime) {
        appLogger.debug('apple_music_token_cache_hit');
        return this.token;
      }
    }

    const { keyId, teamId, privateKey } = this.getConfig();

    const cleanPrivateKey = privateKey
      .replaceAll('\\n', '\n')
      .trim();

    // Verify the private key is in PEM format
    if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----') ||
        !cleanPrivateKey.includes('-----END PRIVATE KEY-----')) {
      appLogger.error('apple_music_private_key_invalid_format');
      throw new Error('Invalid private key format. Must be in PEM format with BEGIN and END markers.');
    }

    const payload = {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60), // 180 days
    };

    try {
      this.token = jwt.sign(payload, cleanPrivateKey, {
        algorithm: 'ES256',
        keyid: keyId,
      });
      this.tokenExpiryTime = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      
      appLogger.debug('apple_music_token_generated');
      
      return this.token;
    } catch (error) {
      appLogger.error('apple_music_token_sign_failed', { error });
      throw new Error(`Failed to generate Apple Music token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: string): Promise<MusicSearchResult> {
    appLogger.debug('apple_music_search_started');
    const startTime = Date.now();
    
    let token: string;
    try {
      token = await this.getToken();
    } catch (error) {
      appLogger.error('apple_music_token_for_search_failed', { error });
      throw error;
    }
    
    const url = new URL('https://api.music.apple.com/v1/catalog/us/search');
    url.searchParams.append('term', query);
    url.searchParams.append('types', 'songs,artists,albums');
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
      appLogger.error('apple_music_search_failed', {
        status: response.status,
        duration_ms: elapsedTime,
      });
      throw new Error(`Failed to search Apple Music: ${response.status} ${response.statusText}`);
    }

    appLogger.debug('apple_music_search_succeeded', {
      status: response.status,
      duration_ms: elapsedTime,
    });

    const data = await response.json();
    return this.transformSearchResults(data);
  }

  async fetchTopCharts(): Promise<MusicSearchResult> {
    appLogger.debug('apple_music_charts_started');
    const startTime = Date.now();
    
    let token: string;
    try {
      token = await this.getToken();
    } catch (error) {
      appLogger.error('apple_music_token_for_charts_failed', { error });
      throw error;
    }
    
    const url = new URL('https://api.music.apple.com/v1/catalog/us/charts');
    url.searchParams.append('types', 'songs');
    url.searchParams.append('limit', '50');
    url.searchParams.append('chart', 'most-played');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsedTime = Date.now() - startTime;

    if (!response.ok) {
      await response.body?.cancel();
      appLogger.error('apple_music_charts_failed', {
        status: response.status,
        duration_ms: elapsedTime,
      });
      throw new Error(`Failed to fetch Apple Music charts: ${response.status} ${response.statusText}`);
    }

    appLogger.debug('apple_music_charts_succeeded', {
      status: response.status,
      duration_ms: elapsedTime,
    });

    const data = await response.json();
    return this.transformChartResults(data);
  }

  /**
   * Fetch a track directly by Apple Music track ID and return its preview URL.
   */
  async getPreviewByTrackId(trackId: string): Promise<string | null> {
    appLogger.debug('apple_music_preview_lookup_started');

    try {
      const token = await this.getToken();
      const url = `https://api.music.apple.com/v1/catalog/us/songs/${trackId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        await response.body?.cancel();
        appLogger.warn('apple_music_track_fetch_failed', { status: response.status });
        return null;
      }

      const data = await response.json();
      const previewUrl = data.data?.[0]?.attributes?.previews?.[0]?.url;

      if (previewUrl) {
        return previewUrl;
      }

      appLogger.debug('apple_music_preview_unavailable');
      return null;
    } catch (error) {
      appLogger.warn('apple_music_preview_lookup_failed', { error });
      return null;
    }
  }

  private transformSearchResults(data: AppleMusicSearchResponse): MusicSearchResult {
    const results: MusicSearchResult = {
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
    };

    // Transform songs to tracks
    if (data.results?.songs?.data) {
      results.tracks = data.results.songs.data.map((item: AppleMusicSong) => ({
        id: item.id,
        title: item.attributes.name,
        artist: item.attributes.artistName,
        album: item.attributes.albumName,
        artwork: item.attributes.artwork?.url?.toString().replace('{w}x{h}', '500x500') || '',
        duration: item.attributes.durationInMillis,
        previewUrl: item.attributes.previews?.[0]?.url,
        isExplicit: item.attributes.contentRating === 'explicit',
        externalUrls: {
          appleMusic: item.attributes.url,
        },
      }));
    }

    // Transform artists
    if (data.results?.artists?.data) {
      results.artists = data.results.artists.data.map((item: AppleMusicArtist) => ({
        id: item.id,
        name: item.attributes.name,
        artwork: item.attributes.artwork?.url?.replace('{w}x{h}', '500x500') || '',
        genres: item.attributes.genreNames || [],
        externalUrls: {
          appleMusic: item.attributes.url,
        },
      }));
    }

    // Transform albums
    if (data.results?.albums?.data) {
      results.albums = data.results.albums.data.map((item: AppleMusicAlbum) => ({
        id: item.id,
        title: item.attributes.name,
        artist: item.attributes.artistName,
        artwork: item.attributes.artwork?.url?.toString().replace('{w}x{h}', '500x500') || '',
        releaseDate: item.attributes.releaseDate,
        trackCount: item.attributes.trackCount,
        externalUrls: {
          appleMusic: item.attributes.url,
        },
      }));
    }

    return results;
  }

  private transformChartResults(data: AppleMusicChartsResponse): MusicSearchResult {
    const results: MusicSearchResult = {
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
    };

    // Transform chart songs to tracks
    if (data.results?.songs?.[0]?.data) {
      results.tracks = data.results.songs[0].data.map((item: AppleMusicSong) => {
        const artworkUrl = item.attributes.artwork?.url?.toString().replace('{w}x{h}', '500x500') || '';

        return {
          id: item.id,
          title: item.attributes.name,
          artist: item.attributes.artistName,
          album: item.attributes.albumName,
          artwork: artworkUrl,
          duration: item.attributes.durationInMillis,
          previewUrl: item.attributes.previews?.[0]?.url,
          isExplicit: item.attributes.contentRating === 'explicit',
          externalUrls: {
            appleMusic: item.attributes.url,
          },
        };
      });
    }

    return results;
  }
}

export const appleMusicService = new AppleMusicService();
