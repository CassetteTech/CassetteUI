import { clientConfig } from '@/lib/config-client';
import { MusicLinkConversion, PostByIdResponse, ConversionApiResponse, ElementType, MediaListTrack, CreatePlaylistResponse } from '@/types';
import { detectContentType } from '@/utils/content-type-detection';

// interface MusicConnection {
//   id: string;
//   userId: string;
//   service: string;
//   serviceUserId?: string;
//   serviceUsername?: string;
//   connectedAt: string;
//   expiresAt?: string;
// }

class ApiService {
  private baseUrl = clientConfig.api.url;

  constructor() {
    console.log('🔧 API Service initialized with URL:', this.baseUrl);
    console.log('🔧 Environment:', process.env.NODE_ENV);
    console.log('🔧 NEXT_PUBLIC_API_URL_LOCAL:', process.env.NEXT_PUBLIC_API_URL_LOCAL);
    console.log('🔧 Config:', clientConfig.api);
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
    options: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.skipAuth ? { 'Content-Type': 'application/json' } : await this.getAuthHeaders();

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
        throw new Error(`Cannot connect to API at ${url}. Is your local server running on port 5000?`);
      }
      throw error;
    }
  }

  // Music conversion endpoints
  async convertMusicLink(url: string, options?: { anonymous?: boolean; description?: string }): Promise<MusicLinkConversion> {
    console.log('🔄 API Service: convertMusicLink called with:', url, options);

    // Generate idempotency key for request deduplication
    const key = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random()}`;

    const response = await this.request<ConversionApiResponse>('/api/v1/convert', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': key }, // server should honor this
      body: JSON.stringify({
        sourceLink: url,
        description: options?.description || undefined
      }),
      skipAuth: options?.anonymous,
    });

    // Transform the API response to our expected format
    // Handle both success and partial success cases (when success: false but data exists)
    console.log('🔄 API Service: Raw response:', JSON.stringify(response, null, 2));
    
    if (response.details || response.platforms) {
      // Determine content type with fallbacks if elementType is missing/ambiguous
      const elementTypeFromResponse = response.elementType?.toLowerCase();
      let inferredElementType = elementTypeFromResponse;
      if (!inferredElementType) {
        // Try to infer from the source URL
        try {
          const urlInfo = detectContentType(url);
          if (urlInfo?.type) {
            inferredElementType = urlInfo.type;
          }
        } catch {}

        const looksLikeAlbum = Boolean(response.details?.trackCount) || Array.isArray((response.details as { tracks?: unknown[] })?.tracks);
        if (looksLikeAlbum) {
          inferredElementType = 'album';
        } else if (response.platforms) {
          const platformTypes = Object.values(response.platforms)
            .map(p => (p?.elementType || '').toLowerCase())
            .filter(Boolean);
          if (platformTypes.length > 0) {
            // Use the most common platform-reported type
            const counts = platformTypes.reduce<Record<string, number>>((acc, t) => {
              acc[t] = (acc[t] || 0) + 1;
              return acc;
            }, {});
            inferredElementType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          }
        }
        if (!inferredElementType) {
          inferredElementType = 'track';
        }
      }

      const transformedData: MusicLinkConversion = {
        originalUrl: url,
        convertedUrls: {},
        metadata: {
          // Map the inferred element type to our enum
          type: (inferredElementType === 'track' ? ElementType.TRACK :
                 inferredElementType === 'album' ? ElementType.ALBUM :
                 inferredElementType === 'artist' ? ElementType.ARTIST :
                 ElementType.PLAYLIST),
          title: response.details?.title || 'Unknown',
          artist: response.details?.artist || '',
          artwork: response.details?.coverArtUrl || '',
          album: response.details?.album,
          duration: response.details?.duration
        },
        description: response.description || response.caption || undefined,
        username: response.username || undefined,
        postId: response.postId
      };

      // Map album/playlist tracks when provided by the API
      type ApiTrack = {
        title?: string;
        duration?: string;
        trackNumber?: number;
        artists?: string[];
        previewUrl?: string;
      };

      const apiTracks = (response.details as { tracks?: ApiTrack[] })?.tracks;
      if (Array.isArray(apiTracks)) {
        const mappedTracks: MediaListTrack[] = apiTracks.map((t) => ({
          trackNumber: t.trackNumber,
          title: t.title ?? 'Untitled',
          duration: t.duration,
          artists: Array.isArray(t.artists) ? t.artists : undefined,
          previewUrl: t.previewUrl,
        }));
        transformedData.tracks = mappedTracks;
        console.log('🎼 API transform: mapped tracks count =', mappedTracks.length);
      }

      // Extract platform URLs and collect fallback artwork/preview
      let fallbackArtwork = '';
      let fallbackPreview = '';
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

          // Capture fallback artwork from the first available platform artwork
          if (!fallbackArtwork && data?.artworkUrl) {
            fallbackArtwork = data.artworkUrl;
          }

          // Capture preview url fallback
          if (!fallbackPreview && data?.previewUrl && data.previewUrl.trim() !== '') {
            fallbackPreview = data.previewUrl;
          }
        });
        
        // Extract preview URL from any available platform
        if (fallbackPreview) {
          transformedData.previewUrl = fallbackPreview;
        }
      }

      // Also consider main details.previewUrl
      if (!transformedData.previewUrl && response.details?.previewUrl) {
        transformedData.previewUrl = response.details.previewUrl;
      }

      // Use fallback artwork if main artwork empty
      if (!transformedData.metadata.artwork && fallbackArtwork) {
        transformedData.metadata.artwork = fallbackArtwork;
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

  // Add music element to user's profile by creating a post
  async addToProfile(musicElementId: string, elementType: string, description?: string): Promise<{ postId: string }> {
    return this.request('/api/v1/social/posts', {
      method: 'POST',
      body: JSON.stringify({ musicElementId, elementType, description }),
    });
  }

  // Fetch post by ID (includes conversion data)
  async fetchPostById(postId: string, options?: { signal?: AbortSignal }): Promise<PostByIdResponse> {
    return this.request<PostByIdResponse>(`/api/v1/social/posts/${postId}`, {
      signal: options?.signal,
    });
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

  async createPlaylist(playlistId: string, targetPlatform: string): Promise<CreatePlaylistResponse> {
    const connections = await this.getMusicConnections();
    const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]/g, '');
    const targetKey = normalize(targetPlatform);
    const canonicalMap: Record<string, string> = {
      spotify: 'spotify',
      applemusic: 'applemusic',
      deezer: 'deezer',
    };
    const canonicalTarget = canonicalMap[targetKey] || targetPlatform.toLowerCase();

    const hasConnection = connections.services?.some(service => normalize(service) === targetKey);
    console.log('createPlaylist connection check:', { connections, targetPlatform, canonicalTarget, hasConnection });

    if (!hasConnection) {
      throw new Error('No connection found for target platform');
    }
    return this.request<CreatePlaylistResponse>('/api/v1/convert/createPlaylist', {
      method: 'POST',
      body: JSON.stringify({ PlaylistId: playlistId, TargetPlatform: canonicalTarget }),
    });
  }

  async getMusicConnections() {
    return this.request<{ services: string[] }>('/api/v1/music-services/connected');
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
    if (!clientConfig.features.enableLambdaWarmup) return;
    
    try {
      return this.request('/api/v1/warmup', { method: 'POST' });
    } catch (error) {
      console.warn('Lambda warmup failed:', error);
    }
  }
}

export const apiService = new ApiService();
