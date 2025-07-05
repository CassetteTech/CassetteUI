import { appleMusicService } from './apple-music';
import { spotifyService } from './spotify';
import { MusicSearchResult } from '@/types';

class MusicSearchService {
  private cachedChartsData: MusicSearchResult | null = null;
  private chartsLastFetched: Date | null = null;
  private chartsCacheDuration = 30 * 60 * 1000; // 30 minutes
  private activeRequests = new Set<string>();

  async searchMusic(query: string): Promise<MusicSearchResult> {
    console.log(`🔍 Starting music search for: "${query}"`);
    
    // Cancel any previous searches
    this.cancelActiveRequests();
    
    const requestId = `search_${Date.now()}`;
    this.activeRequests.add(requestId);

    try {
      // Try Apple Music first
      try {
        const results = await appleMusicService.search(query);
        this.activeRequests.delete(requestId);
        console.log('✅ Apple Music search completed successfully');
        return results;
      } catch (error) {
        console.warn('⚠️ Apple Music search failed, trying Spotify', error);
        
        // Check if request was cancelled
        if (!this.activeRequests.has(requestId)) {
          throw new Error('Request cancelled');
        }

        // Fallback to Spotify
        const results = await spotifyService.search(query);
        this.activeRequests.delete(requestId);
        console.log('✅ Spotify search completed successfully');
        return results;
      }
    } catch (error) {
      this.activeRequests.delete(requestId);
      console.error('❌ Both search services failed', error);
      throw new Error('Failed to search music (both services failed)');
    }
  }

  async fetchTopCharts(): Promise<MusicSearchResult> {
    console.log('🎵 Requesting top charts');

    // Check if we have valid cached data
    if (this.cachedChartsData && this.chartsLastFetched) {
      const cacheAge = Date.now() - this.chartsLastFetched.getTime();
      if (cacheAge < this.chartsCacheDuration) {
        console.log(`📦 Using cached data (${Math.floor(cacheAge / 60000)}m old)`);
        return this.cachedChartsData;
      } else {
        console.log(`⌛ Cache expired (${Math.floor(cacheAge / 60000)}m old)`);
      }
    }

    const requestId = `charts_${Date.now()}`;
    this.activeRequests.add(requestId);

    try {
      const results = await appleMusicService.fetchTopCharts();
      
      // Check if request is still active
      if (!this.activeRequests.has(requestId)) {
        throw new Error('Request cancelled');
      }
      
      this.activeRequests.delete(requestId);
      
      // Cache the data
      this.cachedChartsData = results;
      this.chartsLastFetched = new Date();
      console.log('✅ Charts data cached successfully');
      
      return results;
    } catch (error) {
      this.activeRequests.delete(requestId);
      
      // If we have cached data and encounter an error, return the cached data
      if (this.cachedChartsData) {
        console.warn('⚠️ Error occurred, falling back to cached data');
        return this.cachedChartsData;
      }
      
      console.error('❌ Failed to fetch charts', error);
      throw new Error('Failed to fetch charts');
    }
  }

  cancelActiveRequests() {
    this.activeRequests.clear();
    console.log('⚠️ Cancelled all active music service requests');
  }
}

export const musicSearchService = new MusicSearchService();