import { apiService } from './api';
import { MusicSearchResult, MusicLinkConversion, Track, Album, Artist, Playlist, type PostPrivacy } from '@/types';

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
}

export const musicService = new MusicService();
