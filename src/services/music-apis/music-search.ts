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
    console.log('🌍 Environment:', {
      env: process.env.NODE_ENV || 'unknown',
      isProduction: process.env.NODE_ENV === 'production',
    });
    
    const overallStartTime = Date.now();
    
    // Cancel any previous searches
    this.cancelActiveRequests();
    
    const requestId = `search_${Date.now()}`;
    this.activeRequests.add(requestId);

    try {
      // Try Apple Music first
      console.log('🎯 Attempting Apple Music as primary service');
      const appleMusicStartTime = Date.now();
      
      try {
        const results = await appleMusicService.search(query);
        this.activeRequests.delete(requestId);
        
        const totalTime = Date.now() - overallStartTime;
        const serviceTime = Date.now() - appleMusicStartTime;
        
        console.log('✅ Apple Music search completed successfully:', {
          serviceTime: `${serviceTime}ms`,
          totalTime: `${totalTime}ms`,
          resultCounts: {
            tracks: results.tracks.length,
            albums: results.albums.length,
            artists: results.artists.length,
          },
        });
        return results;
      } catch (error) {
        const appleMusicTime = Date.now() - appleMusicStartTime;
        console.warn('⚠️ Apple Music search failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timeElapsed: `${appleMusicTime}ms`,
          willFallback: true,
        });
        
        // Check if request was cancelled
        if (!this.activeRequests.has(requestId)) {
          throw new Error('Request cancelled');
        }

        // Fallback to Spotify
        console.log('🔁 Falling back to Spotify service');
        const spotifyStartTime = Date.now();
        
        const results = await spotifyService.search(query);
        this.activeRequests.delete(requestId);
        
        const totalTime = Date.now() - overallStartTime;
        const spotifyTime = Date.now() - spotifyStartTime;
        
        console.log('✅ Spotify search completed successfully (fallback):', {
          spotifyTime: `${spotifyTime}ms`,
          totalTime: `${totalTime}ms`,
          appleMusicFailureTime: `${appleMusicTime}ms`,
          resultCounts: {
            tracks: results.tracks.length,
            albums: results.albums.length,
            artists: results.artists.length,
          },
        });
        return results;
      }
    } catch (error) {
      this.activeRequests.delete(requestId);
      const totalTime = Date.now() - overallStartTime;
      
      console.error('❌ Both search services failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime: `${totalTime}ms`,
        query,
      });
      throw new Error('Failed to search music (both services failed)');
    }
  }

  async fetchTopCharts(): Promise<MusicSearchResult> {
    console.log('🎵 Requesting top charts');
    console.log('🌍 Environment:', {
      env: process.env.NODE_ENV || 'unknown',
      isProduction: process.env.NODE_ENV === 'production',
    });
    
    const startTime = Date.now();

    // Check if we have valid cached data
    if (this.cachedChartsData && this.chartsLastFetched) {
      const cacheAge = Date.now() - this.chartsLastFetched.getTime();
      if (cacheAge < this.chartsCacheDuration) {
        console.log(`📦 Using cached data:`, {
          cacheAge: `${Math.floor(cacheAge / 60000)}m ${Math.floor((cacheAge % 60000) / 1000)}s`,
          cacheDuration: `${this.chartsCacheDuration / 60000}m`,
          remainingTime: `${Math.floor((this.chartsCacheDuration - cacheAge) / 60000)}m`,
        });
        return this.cachedChartsData;
      } else {
        console.log(`⌛ Cache expired:`, {
          cacheAge: `${Math.floor(cacheAge / 60000)}m`,
          cacheDuration: `${this.chartsCacheDuration / 60000}m`,
        });
      }
    } else {
      console.log('📦 No cached charts data available');
    }

    const requestId = `charts_${Date.now()}`;
    this.activeRequests.add(requestId);

    try {
      console.log('🎯 Fetching fresh charts from Apple Music');
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
      
      console.log('✅ Charts data cached successfully:', {
        fetchTime: `${fetchTime}ms`,
        totalTime: `${totalTime}ms`,
        trackCount: results.tracks.length,
        cacheExpiry: new Date(this.chartsLastFetched.getTime() + this.chartsCacheDuration).toISOString(),
      });
      
      return results;
    } catch (error) {
      this.activeRequests.delete(requestId);
      const totalTime = Date.now() - startTime;
      
      // If we have cached data and encounter an error, return the cached data
      if (this.cachedChartsData) {
        const cacheAge = this.chartsLastFetched ? 
          Date.now() - this.chartsLastFetched.getTime() : 0;
        
        console.warn('⚠️ Error occurred, falling back to cached data:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          cacheAge: `${Math.floor(cacheAge / 60000)}m`,
          totalTime: `${totalTime}ms`,
        });
        return this.cachedChartsData;
      }
      
      console.error('❌ Failed to fetch charts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime: `${totalTime}ms`,
        hasCachedData: false,
      });
      throw new Error('Failed to fetch charts');
    }
  }

  cancelActiveRequests() {
    this.activeRequests.clear();
    console.log('⚠️ Cancelled all active music service requests');
  }
}

export const musicSearchService = new MusicSearchService();