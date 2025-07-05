import { config } from '@/lib/config';
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
    const clientId = config.spotify.clientId;
    const clientSecret = config.spotify.clientSecret;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured. Please check your environment variables.');
    }

    return { clientId, clientSecret };
  }

  private async getAccessToken(): Promise<string> {
    // Use cached token if valid with 5 minute buffer
    if (this.accessToken && this.tokenExpiryTime) {
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute buffer
      if (this.tokenExpiryTime > bufferTime) {
        return this.accessToken;
      }
    }

    const { clientId, clientSecret } = this.getConfig();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.error('Spotify token error:', response.status, await response.text());
      throw new Error(`Failed to get Spotify access token: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Use actual expiry time from response with small safety buffer
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiryTime = new Date(Date.now() + (expiresIn - 60) * 1000);
    
    if (!this.accessToken) {
      throw new Error('Failed to obtain access token from Spotify');
    }
    
    return this.accessToken;
  }

  async search(query: string): Promise<MusicSearchResult> {
    const token = await this.getAccessToken();
    
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

    if (!response.ok) {
      console.error('Spotify search failed:', response.status, await response.text());
      throw new Error(`Failed to search Spotify: ${response.status}`);
    }

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