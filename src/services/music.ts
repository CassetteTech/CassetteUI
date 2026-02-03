import { apiService } from './api';
import { MusicSearchResult, MusicLinkConversion, Track, Album, Artist, Playlist } from '@/types';

class MusicService {
  async searchMusic(query: string): Promise<MusicSearchResult> {
    // Call Next.js API route
    const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search music');
    }
    return response.json();
  }

  async convertMusicLink(url: string, options?: { anonymous?: boolean; description?: string }): Promise<MusicLinkConversion> {
    // Keep using backend API for link conversion
    const result = await apiService.convertMusicLink(url, options);
    return result;
  }

  async addMusicToUserProfile(
    url: string, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    additionalData?: {
      description?: string;
      originalItemDetails?: {
        title: string;
        artist: string;
        type: string;
        coverArtUrl: string;
      };
    }
  ): Promise<MusicLinkConversion> {
    // Use the same convert endpoint but with authentication
    // The backend should associate the music with the user's profile based on JWT token
    
    // For now, we're using the same convertMusicLink method
    // The backend needs to be updated to properly handle authenticated requests
    // and associate posts with the user's profile
    // TODO: Use additionalData when backend supports it
    const result = await apiService.convertMusicLink(url);
    return result;
  }

  async getTopCharts(): Promise<{
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  }> {
    // Call Next.js API route
    const response = await fetch('/api/music/charts');
    if (!response.ok) {
      throw new Error('Failed to fetch top charts');
    }
    return response.json();
  }

  async getTrackById(id: string): Promise<Track> {
    // This would call a specific endpoint to get track details
    const results = await this.searchMusic(id);
    if (results.tracks.length === 0) {
      throw new Error('Track not found');
    }
    return results.tracks[0];
  }

  async getAlbumById(id: string): Promise<Album> {
    // This would call a specific endpoint to get album details
    const results = await this.searchMusic(id);
    if (results.albums.length === 0) {
      throw new Error('Album not found');
    }
    return results.albums[0];
  }

  async getArtistById(id: string): Promise<Artist> {
    // This would call a specific endpoint to get artist details
    const results = await this.searchMusic(id);
    if (results.artists.length === 0) {
      throw new Error('Artist not found');
    }
    return results.artists[0];
  }

  async getPlaylistById(id: string): Promise<Playlist> {
    // This would call a specific endpoint to get playlist details
    const results = await this.searchMusic(id);
    if (results.playlists.length === 0) {
      throw new Error('Playlist not found');
    }
    return results.playlists[0];
  }

  // Extract music info from URL
  extractMusicInfo(url: string): {
    platform: 'spotify' | 'apple' | 'deezer' | 'unknown';
    type: 'track' | 'album' | 'artist' | 'playlist' | 'unknown';
    id: string;
  } {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('spotify.com')) {
      const pathParts = urlObj.pathname.split('/');
      const typeIndex = pathParts.findIndex(part => 
        ['track', 'album', 'artist', 'playlist'].includes(part)
      );
      
      if (typeIndex !== -1 && pathParts[typeIndex + 1]) {
        return {
          platform: 'spotify',
          type: pathParts[typeIndex] as 'track' | 'album' | 'artist' | 'playlist',
          id: pathParts[typeIndex + 1],
        };
      }
    } else if (urlObj.hostname.includes('music.apple.com')) {
      const pathParts = urlObj.pathname.split('/');
      const typeIndex = pathParts.findIndex(part => 
        ['song', 'album', 'artist', 'playlist'].includes(part)
      );
      
      if (typeIndex !== -1 && pathParts[typeIndex + 1]) {
        return {
          platform: 'apple',
          type: pathParts[typeIndex] === 'song' ? 'track' : pathParts[typeIndex] as 'track' | 'album' | 'artist' | 'playlist',
          id: pathParts[typeIndex + 1],
        };
      }
    } else if (urlObj.hostname.includes('deezer.com')) {
      const pathParts = urlObj.pathname.split('/');
      const typeIndex = pathParts.findIndex(part => 
        ['track', 'album', 'artist', 'playlist'].includes(part)
      );
      
      if (typeIndex !== -1 && pathParts[typeIndex + 1]) {
        return {
          platform: 'deezer',
          type: pathParts[typeIndex] as 'track' | 'album' | 'artist' | 'playlist',
          id: pathParts[typeIndex + 1],
        };
      }
    }

    return {
      platform: 'unknown',
      type: 'unknown',
      id: '',
    };
  }
}

export const musicService = new MusicService();