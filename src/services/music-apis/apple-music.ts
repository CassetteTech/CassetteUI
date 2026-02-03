import './server-only';
import jwt from 'jsonwebtoken';
import { serverConfig } from '@/lib/config-server';
import { MusicSearchResult } from '@/types';
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

    // Log credential availability (without exposing sensitive data)
    console.log('🔐 Apple Music Config Check:', {
      environment: process.env.NODE_ENV || 'unknown',
      keyId: keyId ? `present (${keyId.length} chars)` : 'MISSING',
      teamId: teamId ? `present (${teamId.length} chars)` : 'MISSING',
      privateKey: privateKey ? `present (${privateKey.length} chars)` : 'MISSING',
      privateKeyPreview: privateKey ? {
        startsWithBegin: privateKey.includes('-----BEGIN'),
        endsWithEnd: privateKey.includes('-----END'),
        hasNewlines: privateKey.includes('\n'),
        hasEscapedNewlines: privateKey.includes('\\n'),
      } : 'MISSING',
    });

    if (!keyId || !teamId || !privateKey) {
      const missing = [];
      if (!keyId) missing.push('APPLE_MUSIC_KEY_ID');
      if (!teamId) missing.push('APPLE_MUSIC_TEAM_ID');
      if (!privateKey) missing.push('APPLE_MUSIC_PRIVATE_KEY');
      
      console.error('❌ Apple Music credentials missing:', missing.join(', '));
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
        console.log('🔄 Using cached Apple Music token (expires:', this.tokenExpiryTime.toISOString(), ')');
        return this.token;
      } else {
        console.log('🔄 Apple Music token expired or expiring soon, generating new token');
      }
    } else {
      console.log('🔄 No cached Apple Music token, generating new token');
    }

    const { keyId, teamId, privateKey } = this.getConfig();

    // Clean up the private key - handle both \n and actual newlines
    console.log('🔑 Processing Apple Music private key:', {
      originalLength: privateKey.length,
      hasEscapedNewlines: privateKey.includes('\\n'),
      hasActualNewlines: privateKey.includes('\n'),
    });
    
    const cleanPrivateKey = privateKey
      .replaceAll('\\n', '\n')
      .trim();

    console.log('🔑 After cleaning private key:', {
      cleanedLength: cleanPrivateKey.length,
      hasBeginMarker: cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----'),
      hasEndMarker: cleanPrivateKey.includes('-----END PRIVATE KEY-----'),
      lineCount: cleanPrivateKey.split('\n').length,
    });

    // Verify the private key is in PEM format
    if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----') ||
        !cleanPrivateKey.includes('-----END PRIVATE KEY-----')) {
      console.error('❌ Invalid private key format detected');
      throw new Error('Invalid private key format. Must be in PEM format with BEGIN and END markers.');
    }

    const payload = {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60), // 180 days
    };

    try {
      console.log('🔐 Attempting to sign JWT with:', {
        algorithm: 'ES256',
        keyId: keyId,
        teamId: teamId,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      });
      
      this.token = jwt.sign(payload, cleanPrivateKey, {
        algorithm: 'ES256',
        keyid: keyId,
      });
      this.tokenExpiryTime = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      
      console.log('✅ Apple Music JWT token generated successfully:', {
        tokenLength: this.token.length,
        expiresAt: this.tokenExpiryTime.toISOString(),
      });
      
      return this.token;
    } catch (error) {
      console.error('❌ Failed to sign Apple Music token:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        keyId,
        teamId,
      });
      throw new Error(`Failed to generate Apple Music token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: string): Promise<MusicSearchResult> {
    console.log('🎵 Apple Music search starting for query:', query);
    const startTime = Date.now();
    
    let token: string;
    try {
      token = await this.getToken();
    } catch (error) {
      console.error('❌ Failed to get Apple Music token for search:', error);
      throw error;
    }
    
    const url = new URL('https://api.music.apple.com/v1/catalog/us/search');
    url.searchParams.append('term', query);
    url.searchParams.append('types', 'songs,artists,albums');
    url.searchParams.append('limit', '10');

    console.log('🌐 Apple Music API request:', {
      url: url.toString(),
      tokenPresent: !!token,
      tokenLength: token?.length,
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsedTime = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Apple Music search failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500), // First 500 chars of error
        elapsedTime: `${elapsedTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      });
      throw new Error(`Failed to search Apple Music: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Apple Music search successful:', {
      status: response.status,
      elapsedTime: `${elapsedTime}ms`,
    });

    const data = await response.json();
    return this.transformSearchResults(data);
  }

  async fetchTopCharts(): Promise<MusicSearchResult> {
    console.log('📊 Apple Music fetching top charts');
    const startTime = Date.now();
    
    let token: string;
    try {
      token = await this.getToken();
    } catch (error) {
      console.error('❌ Failed to get Apple Music token for charts:', error);
      throw error;
    }
    
    const url = new URL('https://api.music.apple.com/v1/catalog/us/charts');
    url.searchParams.append('types', 'songs');
    url.searchParams.append('limit', '50');
    url.searchParams.append('chart', 'most-played');

    console.log('🌐 Apple Music charts API request:', {
      url: url.toString(),
      tokenPresent: !!token,
      tokenLength: token?.length,
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsedTime = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Apple Music charts failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500), // First 500 chars of error
        elapsedTime: `${elapsedTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      });
      throw new Error(`Failed to fetch Apple Music charts: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Apple Music charts successful:', {
      status: response.status,
      elapsedTime: `${elapsedTime}ms`,
    });

    const data = await response.json();
    return this.transformChartResults(data);
  }

  /**
   * Fetch a track directly by Apple Music track ID and return its preview URL.
   */
  async getPreviewByTrackId(trackId: string): Promise<string | null> {
    console.log('🎵 Apple Music getPreviewByTrackId called for:', trackId);

    try {
      const token = await this.getToken();
      const url = `https://api.music.apple.com/v1/catalog/us/songs/${trackId}`;

      console.log('🔍 Fetching Apple Music track directly:', trackId);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Apple Music track fetch failed:', response.status, await response.text());
        return null;
      }

      const data = await response.json();
      const previewUrl = data.data?.[0]?.attributes?.previews?.[0]?.url;

      if (previewUrl) {
        console.log('✅ Found preview URL via Apple Music direct fetch:', previewUrl);
        return previewUrl;
      }

      console.log('⚠️ Apple Music direct fetch succeeded but no preview URL available');
      return null;
    } catch (error) {
      console.error('❌ Error fetching Apple Music track by ID:', error);
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