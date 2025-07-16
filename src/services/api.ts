import { config } from '@/lib/config';
import { MusicLinkConversion, PostByIdResponse, ConversionApiResponse, ElementType } from '@/types';

interface MusicConnection {
  id: string;
  userId: string;
  service: string;
  serviceUserId?: string;
  serviceUsername?: string;
  connectedAt: string;
  expiresAt?: string;
}

class ApiService {
  private baseUrl = config.api.url;

  constructor() {
    console.log('🔧 API Service initialized with URL:', this.baseUrl);
    console.log('🔧 Environment:', process.env.NODE_ENV);
    console.log('🔧 NEXT_PUBLIC_API_URL_LOCAL:', process.env.NEXT_PUBLIC_API_URL_LOCAL);
    console.log('🔧 Config:', config.api);
  }

  private async getAuthHeaders() {
    // Check if we're in a browser environment before accessing localStorage
    let accessToken = null;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      accessToken = localStorage.getItem('access_token');
      
      if (accessToken) {
        console.log('🔐 Auth token found, adding to headers');
      } else {
        console.log('⚠️ No auth token found in localStorage');
      }
    } else {
      console.log('🔍 Running on server-side, no localStorage access');
    }
    
    return {
      'Content-Type': 'application/json',
      ...(accessToken && {
        Authorization: `Bearer ${accessToken}`,
      }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getAuthHeaders();

    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      body: options.body
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      console.log('🌐 API Response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: 'An error occurred',
        }));
        console.error('❌ API Error Response:', error);
        throw new Error(error.message || 'API request failed');
      }

      let data;
      try {
        const text = await response.text();
        console.log('📝 API Response Text:', text);
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from API');
      }
      console.log('✅ API Response Data:', data);
      return data;
    } catch (error) {
      console.error('❌ API Request Failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to API at ${url}. Is your local server running on port 5173?`);
      }
      throw error;
    }
  }

  // Music conversion endpoints
  async convertMusicLink(url: string): Promise<MusicLinkConversion> {
    console.log('🔄 API Service: convertMusicLink called with:', url);
    const response = await this.request<ConversionApiResponse>('/api/v1/convert', {
      method: 'POST',
      body: JSON.stringify({ sourceLink: url }),
    });

    // Transform the API response to our expected format
    // Handle both success and partial success cases (when success: false but data exists)
    console.log('🔄 API Service: Raw response:', JSON.stringify(response, null, 2));
    
    if (response.details || response.platforms) {
      const transformedData: MusicLinkConversion = {
        originalUrl: url,
        convertedUrls: {},
        metadata: {
          type: (response.elementType?.toLowerCase() === 'track' ? ElementType.TRACK :
                 response.elementType?.toLowerCase() === 'album' ? ElementType.ALBUM :
                 response.elementType?.toLowerCase() === 'artist' ? ElementType.ARTIST :
                 ElementType.PLAYLIST),
          title: response.details?.title || 'Unknown',
          artist: response.details?.artist || '',
          artwork: response.details?.coverArtUrl || '',
          album: response.details?.album,
          duration: response.details?.duration
        },
        description: response.caption || undefined,
        username: response.username || undefined,
        postId: response.postId
      };

      // Extract platform URLs
      if (response.platforms) {
        Object.entries(response.platforms).forEach(([platform, data]) => {
          const platformKey = platform.toLowerCase();
          
          // Handle platform URLs - use provided URL or construct from platformSpecificId
          let platformUrl = data?.url;
          
          console.log(`🔗 Processing ${platformKey}:`, { 
            originalUrl: data?.url, 
            platformSpecificId: data?.platformSpecificId,
            elementType: data?.elementType 
          });
          
          // If URL is empty but we have platformSpecificId, construct the URL
          if (!platformUrl && data?.platformSpecificId) {
            const elementType = data.elementType?.toLowerCase() || response.elementType?.toLowerCase() || 'track';
            
            if (platformKey === 'spotify') {
              platformUrl = `https://open.spotify.com/${elementType}/${data.platformSpecificId}`;
              console.log(`🎵 Constructed Spotify URL: ${platformUrl}`);
            } else if (platformKey === 'deezer') {
              platformUrl = `https://www.deezer.com/${elementType}/${data.platformSpecificId}`;
              console.log(`🎵 Constructed Deezer URL: ${platformUrl}`);
            } else if (platformKey === 'applemusic' || platformKey === 'apple') {
              // Apple Music URLs are more complex, use the provided URL if available
              platformUrl = data.url;
              console.log(`🎵 Apple Music URL: ${platformUrl}`);
            }
          }
          
          // Map platform names to our expected format
          if (platformUrl) {
            if (platformKey === 'spotify') {
              transformedData.convertedUrls.spotify = platformUrl;
            } else if (platformKey === 'applemusic' || platformKey === 'apple') {
              transformedData.convertedUrls.appleMusic = platformUrl;
            } else if (platformKey === 'deezer') {
              transformedData.convertedUrls.deezer = platformUrl;
            }
          }
        });
        
        // Extract preview URL from any available platform
        const previewUrls = Object.values(response.platforms)
          .map(platform => platform.previewUrl)
          .filter(url => url && url.trim() !== '');
        
        if (previewUrls.length > 0) {
          transformedData.previewUrl = previewUrls[0];
        }
      }

      console.log('✅ API Service: Transformed response:', transformedData);
      return transformedData;
    } else {
      // If no data, throw an error
      throw new Error(response.errorMessage || 'Failed to convert music link');
    }
  }

  // Profile endpoints
  async getProfile(userId: string) {
    return this.request(`/api/v1/profile/${userId}`);
  }

  async updateProfile(data: Record<string, unknown>) {
    return this.request('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserPosts(userId: string, page = 1, limit = 10) {
    return this.request(
      `/api/v1/social/posts/user/${userId}?page=${page}&limit=${limit}`
    );
  }

  // Social endpoints
  async createPost(data: Record<string, unknown>) {
    return this.request('/api/v1/social/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFeed(page = 1, limit = 10) {
    return this.request(`/api/v1/social/feed?page=${page}&limit=${limit}`);
  }

  async likePost(postId: string) {
    return this.request(`/api/v1/social/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async unlikePost(postId: string) {
    return this.request(`/api/v1/social/posts/${postId}/like`, {
      method: 'DELETE',
    });
  }

  // Fetch post by ID (includes conversion data)
  async fetchPostById(postId: string): Promise<PostByIdResponse> {
    return this.request<PostByIdResponse>(`/api/v1/social/posts/${postId}`);
  }

  // Music service authentication endpoints
  async connectSpotify() {
    return this.request<{ authUrl: string }>('/api/v1/music-services/spotify/init', {
      method: 'POST',
      body: JSON.stringify({ returnUrl: window.location.origin + '/spotify_callback' }),
    });
  }

  async handleSpotifyCallback(code: string, state: string) {
    return this.request<{ success: boolean; user?: { id: string; display_name: string } }>('/api/v1/music-services/spotify/exchange-code', {
      method: 'POST',
      body: JSON.stringify({ Code: code, State: state }),
    });
  }

  async connectAppleMusic(userToken: string) {
    return this.request<{ success: boolean }>('/api/v1/music-services/apple-music/user-token', {
      method: 'POST',
      body: JSON.stringify({ MusicUserToken: userToken }),
    });
  }

  async getMusicConnections() {
    return this.request<{ connections: MusicConnection[] }>('/api/v1/music-services/connected');
  }

  async disconnectMusicService(service: string) {
    return this.request<{ success: boolean }>(`/api/v1/music-services/${service}`, {
      method: 'DELETE',
    });
  }

  async getAppleMusicDeveloperToken() {
    return this.request<{ developerToken: string }>('/api/v1/music-services/apple-music/developer-token');
  }

  // Lambda warmup
  async warmupLambdas() {
    if (!config.features.enableLambdaWarmup) return;
    
    try {
      return this.request('/api/v1/warmup', { method: 'POST' });
    } catch (error) {
      console.warn('Lambda warmup failed:', error);
    }
  }
}

export const apiService = new ApiService();