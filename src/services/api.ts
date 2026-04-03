import { clientConfig } from '@/lib/config-client';
import {
  MusicLinkConversion,
  PostByIdResponse,
  PostComment,
  PaginatedPostCommentsResponse,
  CommentLikeResponse,
  ConversionApiResponse,
  ConvertLifecycleResponse,
  ElementType,
  MediaListTrack,
  CreatePlaylistResponse,
  PlatformPreference,
  InternalUsersResponse,
  InternalUserDetailResponse,
  InternalAccountTypeAuditEntry,
  InternalIssuesResponse,
  InternalIssueDetail,
  InternalSignupAttributionOverview,
  InternalSignupAttributionBreakdownResponse,
  InternalSignupAttributionUsersResponse,
  InternalSignupAttributionGroupBy,
  InternalSignupLinkTemplate,
  CreateInternalSignupLinkTemplateRequest,
  UpdateInternalSignupLinkTemplateRequest,
  UpdateInternalAccountTypeRequest,
  NotificationListResponse,
  NotificationUnreadCountResponse,
} from '@/types';
import { detectContentType } from '@/utils/content-type-detection';
import { captureClientEvent, surfaceFromRoute } from '@/lib/analytics/client';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { getBrowserApiBaseUrl } from '@/lib/utils/url';

// interface MusicConnection {
//   id: string;
//   userId: string;
//   service: string;
//   serviceUserId?: string;
//   serviceUsername?: string;
//   connectedAt: string;
//   expiresAt?: string;
// }

// Custom error class to preserve API error details
export class ApiError extends Error {
  requiresReauth: boolean;
  errorCode?: string;
  status?: number;
  retryAfterMs?: number;
  jobId?: string;
  postId?: string;
  apiStatus?: string;

  constructor(
    message: string,
    requiresReauth = false,
    errorCode?: string,
    status?: number,
    details?: { retryAfterMs?: number; jobId?: string; postId?: string; apiStatus?: string }
  ) {
    super(message);
    this.name = 'ApiError';
    this.requiresReauth = requiresReauth;
    this.errorCode = errorCode;
    this.status = status;
    this.retryAfterMs = details?.retryAfterMs;
    this.jobId = details?.jobId;
    this.postId = details?.postId;
    this.apiStatus = details?.apiStatus;
  }
}

class ApiService {
  private baseUrl = getBrowserApiBaseUrl();

  constructor() {
    console.log('🔧 API Service initialized with URL:', this.baseUrl);
    console.log('🔧 Environment:', process.env.NODE_ENV);
    console.log('🔧 NEXT_PUBLIC_API_URL_LOCAL:', process.env.NEXT_PUBLIC_API_URL_LOCAL);
    console.log('🔧 Config:', clientConfig.api);
  }

  private async getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private getCurrentRoute(): string {
    if (typeof window === 'undefined') {
      return '/';
    }

    return window.location.pathname;
  }

  private getCurrentSurface() {
    return surfaceFromRoute(this.getCurrentRoute());
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean; timeoutMs?: number } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { skipAuth, timeoutMs = 60000, signal: externalSignal, ...requestOptions } = options;
    const headers = skipAuth ? { 'Content-Type': 'application/json' } : await this.getAuthHeaders();
    const timeoutController = new AbortController();
    const timeoutHandle = setTimeout(() => timeoutController.abort(), timeoutMs);

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
    }

    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      body: options.body
    });

    try {
      const response = await fetch(url, {
        ...requestOptions,
        // Ensure "anonymous" requests do not carry HttpOnly session cookies.
        credentials: skipAuth ? 'omit' : 'include',
        signal: timeoutController.signal,
        headers: {
          ...headers,
          ...requestOptions.headers,
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
        // Check for auth errors that require re-authentication
        const requiresReauth = error.requires_reauth === true || error.error_code === 'AUTH_EXPIRED';
        throw new ApiError(
          error.error || error.message || 'API request failed',
          requiresReauth,
          error.error_code,
          response.status,
          {
            retryAfterMs: error.retryAfterMs,
            jobId: error.jobId,
            postId: error.postId,
            apiStatus: error.status,
          }
        );
      }

      // Handle 204 No Content responses (e.g., DELETE)
      if (response.status === 204) {
        console.log('✅ API Response: 204 No Content');
        return undefined as T;
      }

      let data;
      try {
        const text = await response.text();
        console.log('📝 API Response Text:', text);
        // Handle empty responses
        if (!text || text.trim() === '') {
          console.log('✅ API Response: Empty body');
          return undefined as T;
        }
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from API');
      }
      console.log('✅ API Response Data:', data);
      return data;
    } catch (error) {
      console.error('❌ API Request Failed:', error);
      const aborted = error instanceof DOMException
        ? error.name === 'AbortError'
        : error instanceof Error && error.name === 'AbortError';
      if (aborted) {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s: ${endpoint}`);
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to API at ${url}. Is your local server running on port 5000?`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  // Music conversion endpoints
  async convertMusicLink(
    url: string,
    options?: { anonymous?: boolean; description?: string; idempotencyKey?: string }
  ): Promise<MusicLinkConversion> {
    console.log('🔄 API Service: convertMusicLink called with:', url, options);
    const detected = detectContentType(url);

    void captureClientEvent('link_conversion_submitted', {
      route: this.getCurrentRoute(),
      source_surface: this.getCurrentSurface(),
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(url),
      is_authenticated: !options?.anonymous,
      status: 'submitted',
      success: false,
    });

    // Generate idempotency key for request deduplication
    const key = options?.idempotencyKey || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random()}`);

    const response = await this.request<ConvertLifecycleResponse | ConversionApiResponse>('/api/v1/convert', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': key }, // server should honor this
      body: JSON.stringify({
        sourceLink: url,
        description: options?.description || undefined,
      }),
      skipAuth: options?.anonymous,
      // Authenticated add-to-profile flows can take longer.
      timeoutMs: options?.anonymous ? 60000 : 120000,
    });

    console.log('🔄 API Service: Raw response:', JSON.stringify(response, null, 2));

    // New contract: convert returns a lifecycle envelope; poll jobs until ready.
    if ('status' in response && (response.status === 'ready' || response.status === 'processing' || response.status === 'failed')) {
      if (response.status === 'ready' && response.postId) {
        return {
          originalUrl: url,
          convertedUrls: {},
          metadata: {
            type: (detected.type === 'track' ? ElementType.TRACK :
                   detected.type === 'album' ? ElementType.ALBUM :
                   detected.type === 'artist' ? ElementType.ARTIST :
                   ElementType.PLAYLIST),
            title: 'Loading...',
            artist: '',
            artwork: '',
          },
          description: options?.description || undefined,
          postId: response.postId,
        };
      }

      if (response.status === 'processing' && response.jobId) {
        const resolvedPostId = await this.waitForConvertJob(response.jobId, response.retryAfterMs, options?.anonymous);
        return {
          originalUrl: url,
          convertedUrls: {},
          metadata: {
            type: (detected.type === 'track' ? ElementType.TRACK :
                   detected.type === 'album' ? ElementType.ALBUM :
                   detected.type === 'artist' ? ElementType.ARTIST :
                   ElementType.PLAYLIST),
            title: 'Loading...',
            artist: '',
            artwork: '',
          },
          description: options?.description || undefined,
          postId: resolvedPostId,
        };
      }

      throw new Error(response.message || response.errorCode || 'Failed to convert music link');
    }

    // Backward-compat parsing for legacy payloads.
    const legacyResponse = response as ConversionApiResponse;
    if (legacyResponse.details || legacyResponse.platforms) {
      // Determine content type with fallbacks if elementType is missing/ambiguous
      const elementTypeFromResponse = legacyResponse.elementType?.toLowerCase();
      let inferredElementType = elementTypeFromResponse;
      if (!inferredElementType) {
        // Try to infer from the source URL
        try {
          const urlInfo = detectContentType(url);
          if (urlInfo?.type) {
            inferredElementType = urlInfo.type;
          }
        } catch {}

        const looksLikeAlbum = Boolean(legacyResponse.details?.trackCount) || Array.isArray((legacyResponse.details as { tracks?: unknown[] })?.tracks);
        if (looksLikeAlbum) {
          inferredElementType = 'album';
        } else if (legacyResponse.platforms) {
          const platformTypes = Object.values(legacyResponse.platforms)
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

      const resolvedPostId = (
        legacyResponse.postId ||
        (legacyResponse as unknown as { PostId?: string }).PostId ||
        (legacyResponse as unknown as { redirectPostId?: string }).redirectPostId ||
        (legacyResponse as unknown as { RedirectPostId?: string }).RedirectPostId ||
        ''
      );

      const transformedData: MusicLinkConversion = {
        originalUrl: url,
        convertedUrls: {},
        metadata: {
          // Map the inferred element type to our enum
          type: (inferredElementType === 'track' ? ElementType.TRACK :
                 inferredElementType === 'album' ? ElementType.ALBUM :
                 inferredElementType === 'artist' ? ElementType.ARTIST :
                 ElementType.PLAYLIST),
          title: legacyResponse.details?.title || 'Unknown',
          artist: legacyResponse.details?.artist || '',
          artwork: legacyResponse.details?.coverArtUrl || '',
          album: legacyResponse.details?.album,
          duration: legacyResponse.details?.duration
        },
        description: legacyResponse.description || legacyResponse.caption || undefined,
        username: legacyResponse.username || undefined,
        postId: resolvedPostId,
        conversionSuccessCount: legacyResponse.conversionSuccessCount,
      };

      // Map album/playlist tracks when provided by the API
      type ApiTrack = {
        title?: string;
        duration?: string;
        trackNumber?: number;
        artists?: string[];
        previewUrl?: string;
      };

      const apiTracks = (legacyResponse.details as { tracks?: ApiTrack[] })?.tracks;
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
      if (legacyResponse.platforms) {
        Object.entries(legacyResponse.platforms).forEach(([platform, data]) => {
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
            const elementType = data.elementType?.toLowerCase() || legacyResponse.elementType?.toLowerCase() || 'track';
            
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
      if (!transformedData.previewUrl && legacyResponse.details?.previewUrl) {
        transformedData.previewUrl = legacyResponse.details.previewUrl;
      }

      // Use fallback artwork if main artwork empty
      if (!transformedData.metadata.artwork && fallbackArtwork) {
        transformedData.metadata.artwork = fallbackArtwork;
      }

      console.log('✅ API Service: Transformed response:', transformedData);
      return transformedData;
    } else {
      // If no data, throw an error
      throw new Error((response as ConversionApiResponse).errorMessage || 'Failed to convert music link');
    }
  }

  private async waitForConvertJob(jobId: string, initialRetryMs?: number, anonymous?: boolean): Promise<string> {
    const startedAt = Date.now();
    const timeoutMs = 45_000;
    let retryMs = initialRetryMs ?? 400;

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(100, retryMs)));
      const jobResponse = await this.request<ConvertLifecycleResponse>(`/api/v1/convert/jobs/${encodeURIComponent(jobId)}`, {
        skipAuth: anonymous,
        timeoutMs: 60_000,
      });

      if (jobResponse.status === 'ready' && jobResponse.postId) {
        return jobResponse.postId;
      }
      if (jobResponse.status === 'failed') {
        throw new Error(jobResponse.message || jobResponse.errorCode || 'Conversion failed');
      }

      retryMs = jobResponse.retryAfterMs ?? 400;
    }

    throw new Error('Conversion is still processing. Please try again.');
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
      `/api/v1/social/users/${userId}/posts?page=${page}&pageSize=${limit}`
    );
  }

  async getUserPostCount(userId: string): Promise<number> {
    const response = await this.request<{ totalItems?: number }>(
      `/api/v1/social/users/${userId}/posts?page=1&pageSize=1`,
      { timeoutMs: 15000 }
    );
    return typeof response.totalItems === 'number' ? response.totalItems : 0;
  }

  // Internal dashboard endpoints
  async getInternalUsers(params: {
    q?: string;
    accountType?: string;
    isOnboarded?: string;
    sortBy?: 'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d';
    sortDirection?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  } = {}): Promise<InternalUsersResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.accountType) query.set('accountType', params.accountType);
    if (params.isOnboarded) query.set('isOnboarded', params.isOnboarded);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDirection) query.set('sortDirection', params.sortDirection);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalUsersResponse>(`/api/v1/internal/users${suffix}`, {
      timeoutMs: 20000,
    });
  }

  async getInternalUserById(userId: string): Promise<InternalUserDetailResponse> {
    return this.request<InternalUserDetailResponse>(`/api/v1/internal/users/${userId}`, {
      timeoutMs: 20000,
    });
  }

  async updateInternalUserInternalAccess(
    userId: string,
    payload: UpdateInternalAccountTypeRequest
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/internal/users/${userId}/internal-access`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      timeoutMs: 20000,
    });
  }

  // Backward-compatible alias for older callers
  async updateInternalUserAccountType(
    userId: string,
    payload: UpdateInternalAccountTypeRequest
  ): Promise<{ success: boolean }> {
    return this.updateInternalUserInternalAccess(userId, payload);
  }

  async getInternalUserAccountTypeAudit(userId: string, limit = 100): Promise<InternalAccountTypeAuditEntry[]> {
    return this.request<InternalAccountTypeAuditEntry[]>(
      `/api/v1/internal/users/${userId}/account-type-audit?limit=${limit}`,
      {
        timeoutMs: 20000,
      }
    );
  }

  async getInternalIssues(params: {
    q?: string;
    reportType?: string;
    sourceContext?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<InternalIssuesResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.reportType) query.set('reportType', params.reportType);
    if (params.sourceContext) query.set('sourceContext', params.sourceContext);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalIssuesResponse>(`/api/v1/internal/issues${suffix}`, {
      timeoutMs: 20000,
    });
  }

  async getInternalIssueById(issueId: string): Promise<InternalIssueDetail> {
    return this.request<InternalIssueDetail>(`/api/v1/internal/issues/${issueId}`, {
      timeoutMs: 20000,
    });
  }

  async exportInternalUsersCsv(params: {
    q?: string;
    accountType?: string;
    isOnboarded?: string;
    sortBy?: 'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d';
    sortDirection?: 'asc' | 'desc';
  } = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.accountType) query.set('accountType', params.accountType);
    if (params.isOnboarded) query.set('isOnboarded', params.isOnboarded);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDirection) query.set('sortDirection', params.sortDirection);
    const suffix = query.toString() ? `?${query.toString()}` : '';

    const url = `${this.baseUrl}/api/v1/internal/users/export${suffix}`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to export CSV' }));
      throw new ApiError(error.message || 'Failed to export CSV');
    }

    return response.blob();
  }

  async getInternalSignupAttributionOverview(params: {
    from?: string;
    to?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    referrerDomain?: string;
  } = {}): Promise<InternalSignupAttributionOverview> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.source) query.set('source', params.source);
    if (params.medium) query.set('medium', params.medium);
    if (params.campaign) query.set('campaign', params.campaign);
    if (params.referrerDomain) query.set('referrerDomain', params.referrerDomain);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalSignupAttributionOverview>(
      `/api/v1/internal/signup-attribution/overview${suffix}`,
      { timeoutMs: 20000 }
    );
  }

  async getInternalSignupAttributionBreakdown(params: {
    groupBy?: InternalSignupAttributionGroupBy;
    from?: string;
    to?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    referrerDomain?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<InternalSignupAttributionBreakdownResponse> {
    const query = new URLSearchParams();
    if (params.groupBy) query.set('groupBy', params.groupBy);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.source) query.set('source', params.source);
    if (params.medium) query.set('medium', params.medium);
    if (params.campaign) query.set('campaign', params.campaign);
    if (params.referrerDomain) query.set('referrerDomain', params.referrerDomain);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalSignupAttributionBreakdownResponse>(
      `/api/v1/internal/signup-attribution/breakdown${suffix}`,
      { timeoutMs: 20000 }
    );
  }

  async getInternalSignupAttributionUsers(params: {
    q?: string;
    from?: string;
    to?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    referrerDomain?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<InternalSignupAttributionUsersResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.source) query.set('source', params.source);
    if (params.medium) query.set('medium', params.medium);
    if (params.campaign) query.set('campaign', params.campaign);
    if (params.referrerDomain) query.set('referrerDomain', params.referrerDomain);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalSignupAttributionUsersResponse>(
      `/api/v1/internal/signup-attribution/users${suffix}`,
      { timeoutMs: 20000 }
    );
  }

  async exportInternalSignupAttributionCsv(params: {
    view: 'users' | 'breakdown';
    groupBy?: InternalSignupAttributionGroupBy;
    q?: string;
    from?: string;
    to?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    referrerDomain?: string;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    query.set('view', params.view);
    if (params.groupBy) query.set('groupBy', params.groupBy);
    if (params.q) query.set('q', params.q);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.source) query.set('source', params.source);
    if (params.medium) query.set('medium', params.medium);
    if (params.campaign) query.set('campaign', params.campaign);
    if (params.referrerDomain) query.set('referrerDomain', params.referrerDomain);

    const url = `${this.baseUrl}/api/v1/internal/signup-attribution/export?${query.toString()}`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new ApiError(`Failed to export signup attribution CSV (${response.status})`, false, undefined, response.status);
    }

    return response.blob();
  }

  async getInternalSignupLinkTemplates(): Promise<InternalSignupLinkTemplate[]> {
    return this.request<InternalSignupLinkTemplate[]>(
      '/api/v1/internal/signup-link-templates',
      { timeoutMs: 20000 }
    );
  }

  async createInternalSignupLinkTemplate(
    payload: CreateInternalSignupLinkTemplateRequest
  ): Promise<InternalSignupLinkTemplate> {
    return this.request<InternalSignupLinkTemplate>('/api/v1/internal/signup-link-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 20000,
    });
  }

  async updateInternalSignupLinkTemplate(
    templateId: string,
    payload: UpdateInternalSignupLinkTemplateRequest
  ): Promise<InternalSignupLinkTemplate> {
    return this.request<InternalSignupLinkTemplate>(
      `/api/v1/internal/signup-link-templates/${templateId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
        timeoutMs: 20000,
      }
    );
  }

  async deleteInternalSignupLinkTemplate(templateId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/api/v1/internal/signup-link-templates/${templateId}`,
      {
        method: 'DELETE',
        timeoutMs: 20000,
      }
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

  async repostPost(postId: string): Promise<{ postId?: string; redirectPostId?: string; originalPostId?: string | null }> {
    return this.request(`/api/v1/social/posts/${postId}/repost`, {
      method: 'POST',
    });
  }

  async unrepostPost(postId: string): Promise<void> {
    await this.request(`/api/v1/social/posts/${postId}/repost`, {
      method: 'DELETE',
    });
  }

  // Notification endpoints
  async getNotifications(page = 1, pageSize = 20): Promise<NotificationListResponse> {
    return this.request<NotificationListResponse>(
      `/api/v1/notifications?page=${page}&pageSize=${pageSize}`
    );
  }

  async getUnreadNotificationCount(): Promise<NotificationUnreadCountResponse> {
    return this.request<NotificationUnreadCountResponse>('/api/v1/notifications/unread-count');
  }

  async markNotificationsAsRead(notificationIds: string[]): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/v1/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/v1/notifications/read-all', {
      method: 'POST',
    });
  }

  // Add music element to user's profile by creating a post
  async addToProfile(musicElementId: string, elementType: string, description?: string): Promise<{ postId: string }> {
    return this.request('/api/v1/social/posts', {
      method: 'POST',
      body: JSON.stringify({ musicElementId, elementType, description }),
    });
  }

  // Update a post's description and/or privacy
  async updatePost(
    postId: string,
    updates: { description?: string; privacy?: string; commentsEnabled?: boolean }
  ): Promise<{ postId: string; description?: string; privacy?: string; commentsEnabled?: boolean }> {
    const payload: Record<string, unknown> = {};
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.privacy !== undefined) payload.privacy = updates.privacy;
    if (updates.commentsEnabled !== undefined) payload.commentsEnabled = updates.commentsEnabled;

    return this.request(`/api/v1/social/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Delete a post
  async deletePost(postId: string): Promise<void> {
    await this.request(`/api/v1/social/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  // Fetch post by ID (includes conversion data)
  async fetchPostById(postId: string, options?: { signal?: AbortSignal }): Promise<PostByIdResponse> {
    return this.request<PostByIdResponse>(`/api/v1/social/posts/${postId}`, {
      signal: options?.signal,
    });
  }

  async getPostComments(postId: string, page = 1, pageSize = 50): Promise<PaginatedPostCommentsResponse> {
    return this.request<PaginatedPostCommentsResponse>(
      `/api/v1/social/posts/${postId}/comments?page=${page}&pageSize=${pageSize}`
    );
  }

  async createPostComment(postId: string, content: string): Promise<PostComment> {
    return this.request<PostComment>(`/api/v1/social/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async replyToPostComment(commentId: string, content: string): Promise<PostComment> {
    return this.request<PostComment>(`/api/v1/social/comments/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updatePostComment(commentId: string, content: string): Promise<PostComment> {
    return this.request<PostComment>(`/api/v1/social/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deletePostComment(commentId: string): Promise<void> {
    await this.request(`/api/v1/social/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async likePostComment(commentId: string): Promise<CommentLikeResponse> {
    return this.request<CommentLikeResponse>(`/api/v1/social/comments/${commentId}/like`, {
      method: 'POST',
    });
  }

  async unlikePostComment(commentId: string): Promise<CommentLikeResponse> {
    return this.request<CommentLikeResponse>(`/api/v1/social/comments/${commentId}/like`, {
      method: 'DELETE',
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

  async createPlaylist(playlistId: string, targetPlatform: string, postId?: string): Promise<CreatePlaylistResponse> {
    const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]/g, '');
    const targetKey = normalize(targetPlatform);
    const canonicalMap: Record<string, string> = {
      spotify: 'spotify',
      applemusic: 'applemusic',
      deezer: 'deezer',
    };
    const canonicalTarget = canonicalMap[targetKey] || targetPlatform.toLowerCase();

    // Skip connection check for Spotify if using Cassette's account
    const skipConnectionCheck = targetKey === 'spotify' && clientConfig.features.useCassetteSpotifyAccount;

    if (!skipConnectionCheck) {
      const connections = await this.getMusicConnections();
      const hasConnection = connections.services?.some(service => normalize(service) === targetKey);
      console.log('createPlaylist connection check:', { connections, targetPlatform, canonicalTarget, hasConnection });

      if (!hasConnection) {
        throw new Error('No connection found for target platform');
      }
    } else {
      console.log('createPlaylist: Skipping connection check for Spotify (using Cassette account)');
    }

    return this.request<CreatePlaylistResponse>('/api/v1/convert/createPlaylist', {
      method: 'POST',
      body: JSON.stringify({ PlaylistId: playlistId, TargetPlatform: canonicalTarget, PostId: postId || undefined }),
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

  // Platform preference endpoints (separate from OAuth authentication)
  async getPlatformPreferences() {
    return this.request<{ success: boolean; preferences: PlatformPreference[] }>('/api/v1/music-services/preferences');
  }

  async setPlatformPreferences(platforms: string[]) {
    return this.request<{ success: boolean; preferences: PlatformPreference[]; message?: string }>('/api/v1/music-services/preferences', {
      method: 'POST',
      body: JSON.stringify({ platforms }),
    });
  }

  async removePlatformPreference(platform: string) {
    return this.request<{ success: boolean; message?: string }>(`/api/v1/music-services/preferences/${platform}`, {
      method: 'DELETE',
    });
  }

  async getAppleMusicDeveloperToken() {
    return this.request<{ developerToken: string }>('/api/v1/music-services/apple-music/developer-token');
  }

  // Lambda warmup
  async warmupLambdas() {
    if (!clientConfig.features.enableLambdaWarmup) return;
    const warmupSessionKey = 'cassette_lambda_warmup_attempted_v1';

    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(warmupSessionKey) === '1') return;
        sessionStorage.setItem(warmupSessionKey, '1');
      } catch {
        // Ignore session storage failures and proceed with best-effort warmup
      }
    }

    try {
      return this.request('/api/v1/convert/warmup', { method: 'GET', skipAuth: true });
    } catch (error) {
      console.warn('Lambda warmup failed:', error);
    }
  }

  // Issue reporting
  async reportIssue(data: {
    reportType: string;
    sourceContext: string;
    pageUrl: string;
    sourceLink?: string;
    description?: string;
    context?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string; issueId?: string }> {
    console.log('📝 API Service: reportIssue called with:', data);
    void captureClientEvent('issue_report_submitted', {
      route: this.getCurrentRoute(),
      source_surface: this.getCurrentSurface(),
      source_context: data.sourceContext,
      report_type: data.reportType as 'conversion_issue' | 'ui_bug' | 'general_feedback' | 'missing_track' | 'wrong_match',
      has_description: Boolean(data.description && data.description.trim().length > 0),
      has_conversion_context: Boolean(data.sourceLink),
      status: 'submitted',
      success: false,
    });

    return this.request('/api/v1/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();
