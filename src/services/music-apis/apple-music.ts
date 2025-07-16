import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';
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
    const keyId = config.appleMusic.keyId;
    const teamId = config.appleMusic.teamId;
    const privateKey = config.appleMusic.privateKey;

    if (!keyId || !teamId || !privateKey) {
      throw new Error('Apple Music credentials not configured. Please check your environment variables.');
    }

    return { keyId, teamId, privateKey };
  }

  private async getToken(): Promise<string> {
    // Use cached token if valid with 1 day buffer
    if (this.token && this.tokenExpiryTime) {
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day buffer
      if (this.tokenExpiryTime > bufferTime) {
        return this.token;
      }
    }

    const { keyId, teamId, privateKey } = this.getConfig();

    // Clean up the private key - handle both \n and actual newlines
    const cleanPrivateKey = privateKey
      .replaceAll('\\n', '\n')
      .trim();

    // Verify the private key is in PEM format
    if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----') ||
        !cleanPrivateKey.includes('-----END PRIVATE KEY-----')) {
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
      return this.token;
    } catch (error) {
      console.error('Failed to sign Apple Music token:', error);
      throw new Error('Failed to generate Apple Music token. Please check your private key format.');
    }
  }

  async search(query: string): Promise<MusicSearchResult> {
    const token = await this.getToken();
    
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

    if (!response.ok) {
      console.error('Apple Music search failed:', response.status, await response.text());
      throw new Error(`Failed to search Apple Music: ${response.status}`);
    }

    const data = await response.json();
    return this.transformSearchResults(data);
  }

  async fetchTopCharts(): Promise<MusicSearchResult> {
    const token = await this.getToken();
    
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

    if (!response.ok) {
      console.error('Apple Music charts failed:', response.status, await response.text());
      throw new Error(`Failed to fetch Apple Music charts: ${response.status}`);
    }

    const data = await response.json();
    return this.transformChartResults(data);
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