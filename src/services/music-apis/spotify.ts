import './server-only';
import { serverConfig } from '@/lib/config-server';
import { MusicSearchResult } from '@/types';
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

    // Log credential availability (without exposing sensitive data)
    console.log('🔐 Spotify Config Check:', {
      environment: process.env.NODE_ENV || 'unknown',
      clientId: clientId ? `present (${clientId.length} chars)` : 'MISSING',
      clientSecret: clientSecret ? `present (${clientSecret.length} chars)` : 'MISSING',
    });

    if (!clientId || !clientSecret) {
      const missing = [];
      if (!clientId) missing.push('SPOTIFY_CLIENT_ID');
      if (!clientSecret) missing.push('SPOTIFY_CLIENT_SECRET');
      
      console.error('❌ Spotify credentials missing:', missing.join(', '));
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
        console.log('🔄 Using cached Spotify token (expires:', this.tokenExpiryTime.toISOString(), ')');
        return this.accessToken;
      } else {
        console.log('🔄 Spotify token expired or expiring soon, fetching new token');
      }
    } else {
      console.log('🔄 No cached Spotify token, fetching new token');
    }

    const { clientId, clientSecret } = this.getConfig();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    console.log('🔐 Requesting Spotify access token');
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
      const errorBody = await response.text();
      console.error('❌ Spotify token error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500),
        elapsedTime: `${elapsedTime}ms`,
      });
      throw new Error(`Failed to get Spotify access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Use actual expiry time from response with small safety buffer
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiryTime = new Date(Date.now() + (expiresIn - 60) * 1000);
    
    console.log('✅ Spotify token obtained successfully:', {
      tokenLength: this.accessToken?.length,
      expiresIn: `${expiresIn}s`,
      expiresAt: this.tokenExpiryTime.toISOString(),
      elapsedTime: `${elapsedTime}ms`,
    });
    
    if (!this.accessToken) {
      console.error('❌ No access token in Spotify response');
      throw new Error('Failed to obtain access token from Spotify');
    }
    
    return this.accessToken;
  }

  async search(query: string): Promise<MusicSearchResult> {
    console.log('🎵 Spotify search starting for query:', query);
    console.log('🔁 Note: Spotify being used as fallback service');
    const startTime = Date.now();
    
    let token: string;
    try {
      token = await this.getAccessToken();
    } catch (error) {
      console.error('❌ Failed to get Spotify token for search:', error);
      throw error;
    }
    
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'track,artist,album');
    url.searchParams.append('limit', '10');

    console.log('🌐 Spotify API request:', {
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
      console.error('❌ Spotify search failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500),
        elapsedTime: `${elapsedTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      });
      throw new Error(`Failed to search Spotify: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Spotify search successful:', {
      status: response.status,
      elapsedTime: `${elapsedTime}ms`,
    });

    const data = await response.json();
    return this.transformSearchResults(data);
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