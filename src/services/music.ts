import { apiService } from './api';
import { MusicSearchResult, MusicLinkConversion, Track, Album, Artist, Playlist, type PostPrivacy } from '@/types';
import { detectContentType } from '@/utils/content-type-detection';

class MusicService {
  async searchMusic(query: string): Promise<MusicSearchResult> {
    const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search music');
    }
    return response.json();
  }

  async convertMusicLink(
    url: string,
    options?: { anonymous?: boolean; description?: string; idempotencyKey?: string; privacy?: PostPrivacy }
  ): Promise<MusicLinkConversion> {
    const result = await apiService.convertMusicLink(url, options);
    return result;
  }

  async getTopCharts(): Promise<{
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  }> {
    const response = await fetch('/api/music/charts');
    if (!response.ok) {
      throw new Error('Failed to fetch top charts');
    }
    return response.json();
  }

  extractMusicInfo(url: string): {
    platform: 'spotify' | 'apple' | 'deezer' | 'unknown';
    type: 'track' | 'album' | 'artist' | 'playlist' | 'unknown';
    id: string;
  } {
    const detected = detectContentType(url);

    return {
      platform: detected.platform,
      type: detected.id ? detected.type : 'unknown',
      id: detected.id,
    };
  }
}

export const musicService = new MusicService();
