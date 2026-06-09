import { appleMusicService } from './apple-music';
import { spotifyService } from './spotify';
import { MusicSearchResult } from '@/types';
import { appLogger } from '@/lib/observability/logger';

class MusicSearchService {
  private cachedChartsData: MusicSearchResult | null = null;
  private chartsLastFetched: Date | null = null;
  private chartsCacheDuration = 30 * 60 * 1000; // 30 minutes
  private activeRequests = new Set<string>();

  async searchMusic(query: string): Promise<MusicSearchResult> {
    appLogger.debug('music_search_started');
    
    const overallStartTime = Date.now();
    
    // Cancel any previous searches
    this.cancelActiveRequests();
    
    const requestId = `search_${Date.now()}`;
    this.activeRequests.add(requestId);

    try {
      // Try Apple Music first
      const appleMusicStartTime = Date.now();
      
      try {
        const results = await appleMusicService.search(query);
        this.activeRequests.delete(requestId);
        
        const totalTime = Date.now() - overallStartTime;
        const serviceTime = Date.now() - appleMusicStartTime;
        
        appLogger.debug('music_search_apple_succeeded', {
          duration_ms: totalTime,
          service_duration_ms: serviceTime,
          result_count: results.tracks.length + results.albums.length + results.artists.length,
        });
        return results;
      } catch (error) {
        const appleMusicTime = Date.now() - appleMusicStartTime;
        appLogger.warn('music_search_apple_failed', {
          error,
          duration_ms: appleMusicTime,
          willFallback: true,
        });
        
        // Check if request was cancelled
        if (!this.activeRequests.has(requestId)) {
          throw new Error('Request cancelled');
        }

        // Fallback to Spotify
        const spotifyStartTime = Date.now();
        
        const results = await spotifyService.search(query);
        this.activeRequests.delete(requestId);
        
        const totalTime = Date.now() - overallStartTime;
        const spotifyTime = Date.now() - spotifyStartTime;
        
        appLogger.debug('music_search_spotify_fallback_succeeded', {
          duration_ms: totalTime,
          service_duration_ms: spotifyTime,
          apple_duration_ms: appleMusicTime,
          result_count: results.tracks.length + results.albums.length + results.artists.length,
        });
        return results;
      }
    } catch (error) {
      this.activeRequests.delete(requestId);
      const totalTime = Date.now() - overallStartTime;
      
      appLogger.error('music_search_failed', {
        error,
        duration_ms: totalTime,
      });
      throw new Error('Failed to search music (both services failed)');
    }
  }

  async fetchTopCharts(): Promise<MusicSearchResult> {
    appLogger.debug('top_charts_requested');
    
    const startTime = Date.now();

    // Check if we have valid cached data
    if (this.cachedChartsData && this.chartsLastFetched) {
      const cacheAge = Date.now() - this.chartsLastFetched.getTime();
      if (cacheAge < this.chartsCacheDuration) {
        appLogger.debug('top_charts_cache_hit', {
          duration_ms: cacheAge,
        });
        return this.cachedChartsData;
      }
    }

    const requestId = `charts_${Date.now()}`;
    this.activeRequests.add(requestId);

    try {
      const fetchStartTime = Date.now();
      
      const results = await appleMusicService.fetchTopCharts();
      
      // Check if request is still active
      if (!this.activeRequests.has(requestId)) {
        throw new Error('Request cancelled');
      }
      
      this.activeRequests.delete(requestId);
      
      const fetchTime = Date.now() - fetchStartTime;
      const totalTime = Date.now() - startTime;
      
      // Cache the data
      this.cachedChartsData = results;
      this.chartsLastFetched = new Date();
      
      appLogger.debug('top_charts_fetch_succeeded', {
        duration_ms: totalTime,
        service_duration_ms: fetchTime,
        result_count: results.tracks.length,
      });
      
      return results;
    } catch (error) {
      this.activeRequests.delete(requestId);
      const totalTime = Date.now() - startTime;
      
      // If we have cached data and encounter an error, return the cached data
      if (this.cachedChartsData) {
        const cacheAge = this.chartsLastFetched ? 
          Date.now() - this.chartsLastFetched.getTime() : 0;
        
        appLogger.warn('top_charts_fallback_to_cache', {
          error,
          cache_age_ms: cacheAge,
          duration_ms: totalTime,
        });
        return this.cachedChartsData;
      }
      
      appLogger.error('top_charts_fetch_failed', {
        error,
        duration_ms: totalTime,
        hasCachedData: false,
      });
      throw new Error('Failed to fetch charts');
    }
  }

  cancelActiveRequests() {
    this.activeRequests.clear();
    appLogger.debug('music_service_requests_cancelled');
  }
}

export const musicSearchService = new MusicSearchService();
