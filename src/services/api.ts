import { clientConfig } from '@/lib/config-client';
import {
  MusicLinkConversion,
  PostByIdResponse,
  PostViewerStateResponse,
  PostComment,
  PaginatedPostCommentsResponse,
  CommentLikeResponse,
  ConvertLifecycleResponse,
  CreatePlaylistResponse,
  PlatformPreference,
  InternalUsersResponse,
  InternalUserDetailResponse,
  InternalAccountTypeAuditEntry,
  InternalIssuesResponse,
  InternalIssueDetail,
  InternalSentinelFindingsResponse,
  InternalSentinelAuditRunsResponse,
  InternalSentinelInvariantRegistryResponse,
  InternalSentinelRescanResponse,
  ConversionIssueRevalidationSummary,
  StubDuplicateAdjudicationSummary,
  InternalSentinelInvariantNote,
  InternalSentinelInvariantNoteInput,
  InternalSentinelInvariantNotesResponse,
  InternalExploreSnapshotsResponse,
  InternalExploreSnapshotItemsResponse,
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
  PostInsightsResponse,
  CreatePaidPromotionCampaignRequest,
  PaidPromotionCampaign,
  PaidPromotionCheckoutSessionResponse,
  PaidPromotionRateCardsResponse,
  InternalPaidPromotionCampaignSummary,
  InternalPaidPromotionCampaignDetail,
  InternalPaidPromotionActionResponse,
  InternalPaidPromotionDeliverable,
  InternalPaidPromotionDeliverableInput,
  InternalPaidPromotionException,
  InternalPaidPromotionRefundResponse,
} from '@/types';
import { detectContentType } from '@/utils/content-type-detection';
import { captureClientEvent, surfaceFromRoute } from '@/lib/analytics/client';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { getBrowserApiBaseUrl } from '@/lib/utils/url';
import { CASSETTE_CORRELATION_HEADER, createCorrelationId, normalizeCorrelationId } from '@/lib/observability/correlation';
import { getSourceDomain, hashSourceLink, normalizeRouteContext } from '@/lib/observability/source-link';
import { appLogger } from '@/lib/observability/logger';
import { getPlatformDefinition } from '@/lib/platforms';
import {
  createLifecycleConversionPlaceholder,
  getLifecycleConversionFailureMessage,
} from './conversion-lifecycle';
import { parsePaidPromotionCampaign } from './paid-promotion-lifecycle';

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
  correlationId?: string;

  constructor(
    message: string,
    requiresReauth = false,
    errorCode?: string,
    status?: number,
    details?: { retryAfterMs?: number; jobId?: string; postId?: string; apiStatus?: string; correlationId?: string }
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
    this.correlationId = details?.correlationId;
  }
}

class ApiService {
  private baseUrl = getBrowserApiBaseUrl();

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
    options: RequestInit & { skipAuth?: boolean; timeoutMs?: number; correlationId?: string } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { skipAuth, timeoutMs = 60000, signal: externalSignal, correlationId, ...requestOptions } = options;
    const headers = skipAuth ? { 'Content-Type': 'application/json' } : await this.getAuthHeaders();
    const timeoutController = new AbortController();
    const timeoutHandle = setTimeout(() => timeoutController.abort(), timeoutMs);

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        ...requestOptions,
        // Ensure "anonymous" requests do not carry HttpOnly session cookies.
        credentials: skipAuth ? 'omit' : 'include',
        signal: timeoutController.signal,
        headers: {
          ...headers,
          ...requestOptions.headers,
          ...(correlationId ? { [CASSETTE_CORRELATION_HEADER]: correlationId } : {}),
        },
      });

      const responseCorrelationId =
        normalizeCorrelationId(response.headers.get(CASSETTE_CORRELATION_HEADER)) ?? correlationId;

      if (!response.ok) {
        const error: Record<string, unknown> = await response
          .text()
          .then((text) => {
            if (!text || text.trim() === '') {
              return { message: 'An error occurred' };
            }

            try {
              return JSON.parse(text) as Record<string, unknown>;
            } catch {
              return { message: text };
            }
          });
        appLogger.error('api_error_response', {
          status: response.status,
          errorCode: error.error_code ?? error.errorCode,
          correlationId: error.correlationId ?? responseCorrelationId,
        });
        // Check for auth errors that require re-authentication
        const requiresReauth = error.requires_reauth === true || error.error_code === 'AUTH_EXPIRED';
        const errorMessage =
          typeof error.error === 'string'
            ? error.error
            : typeof error.message === 'string'
              ? error.message
              : 'API request failed';
        const errorCode = typeof error.error_code === 'string'
          ? error.error_code
          : typeof error.errorCode === 'string'
            ? error.errorCode
            : undefined;
        const retryAfterMs = typeof error.retryAfterMs === 'number' ? error.retryAfterMs : undefined;
        const jobId = typeof error.jobId === 'string' ? error.jobId : undefined;
        const postId = typeof error.postId === 'string' ? error.postId : undefined;
        const apiStatus = typeof error.status === 'string' ? error.status : undefined;
        const bodyCorrelationId = normalizeCorrelationId(error.correlationId);
        throw new ApiError(
          errorMessage,
          requiresReauth,
          errorCode,
          response.status,
          {
            retryAfterMs,
            jobId,
            postId,
            apiStatus,
            correlationId: bodyCorrelationId ?? responseCorrelationId,
          }
        );
      }

      // Handle 204 No Content responses (e.g., DELETE)
      if (response.status === 204) {
        return undefined as T;
      }

      let data;
      try {
        const text = await response.text();
        // Handle empty responses
        if (!text || text.trim() === '') {
          return undefined as T;
        }
        data = JSON.parse(text);
      } catch (parseError) {
        appLogger.error('api_json_parse_error', { error: parseError, correlationId: responseCorrelationId });
        throw new Error('Invalid JSON response from API');
      }
      if (data && typeof data === 'object' && responseCorrelationId && !('correlationId' in data)) {
        (data as Record<string, unknown>).correlationId = responseCorrelationId;
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        appLogger.error('api_request_failed', {
          route: endpoint,
          status: error.status,
          errorCode: error.errorCode,
          correlationId: error.correlationId ?? correlationId,
        });
      } else {
        appLogger.error('api_request_failed', {
          route: endpoint,
          correlationId,
          errorName: error instanceof Error ? error.name : typeof error,
        });
      }
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
    const correlationId = createCorrelationId();
    const detected = detectContentType(url);
    const sourceLinkHash = await hashSourceLink(url);

    void captureClientEvent('link_conversion_submitted', {
      route: this.getCurrentRoute(),
      source_surface: this.getCurrentSurface(),
      correlation_id: correlationId,
      source_link_hash: sourceLinkHash,
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

    const response = await this.request<ConvertLifecycleResponse>('/api/v1/convert', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': key }, // server should honor this
      body: JSON.stringify({
        sourceLink: url,
        description: options?.description || undefined,
      }),
      skipAuth: options?.anonymous,
      correlationId,
      // Authenticated add-to-profile flows can take longer.
      timeoutMs: options?.anonymous ? 60000 : 120000,
    });

    if (response.status === 'ready') {
      if (!response.postId) {
        throw new Error('Conversion completed without a post id');
      }

      return createLifecycleConversionPlaceholder({
        originalUrl: url,
        detectedType: detected.type,
        description: options?.description,
        postId: response.postId,
        conversionJobId: response.jobId,
        correlationId: response.correlationId ?? correlationId,
      });
    }

    if (response.status === 'processing') {
      if (!response.jobId) {
        throw new Error('Conversion is processing without a job id');
      }

      const resolvedPostId = await this.waitForConvertJob(
        response.jobId,
        response.retryAfterMs,
        options?.anonymous,
        response.correlationId ?? correlationId,
      );

      return createLifecycleConversionPlaceholder({
        originalUrl: url,
        detectedType: detected.type,
        description: options?.description,
        postId: resolvedPostId,
        conversionJobId: response.jobId,
        correlationId: response.correlationId ?? correlationId,
      });
    }

    throw new Error(getLifecycleConversionFailureMessage(response));
  }

  private async waitForConvertJob(jobId: string, initialRetryMs?: number, anonymous?: boolean, correlationId?: string): Promise<string> {
    const startedAt = Date.now();
    const timeoutMs = 45_000;
    let retryMs = initialRetryMs ?? 400;

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(100, retryMs)));
      const jobResponse = await this.request<ConvertLifecycleResponse>(`/api/v1/convert/jobs/${encodeURIComponent(jobId)}`, {
        skipAuth: anonymous,
        timeoutMs: 60_000,
        correlationId,
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

  /**
   * Looks up the caller's conversion job by the X-Idempotency-Key sent to /convert.
   * The job row exists from submission, so this can be polled while the convert
   * request is still in flight to observe the live stage. Returns null while the
   * job isn't visible yet (or on transient poll failures) so callers just retry.
   */
  async getConvertJobByKey(
    idempotencyKey: string,
    options?: { anonymous?: boolean }
  ): Promise<ConvertLifecycleResponse | null> {
    try {
      return await this.request<ConvertLifecycleResponse>(
        `/api/v1/convert/jobs/by-key/${encodeURIComponent(idempotencyKey)}`,
        {
          skipAuth: options?.anonymous,
          timeoutMs: 10_000,
        }
      );
    } catch {
      return null;
    }
  }

  async getPaidPromotionRateCards(): Promise<PaidPromotionRateCardsResponse> {
    return this.request<PaidPromotionRateCardsResponse>('/api/v1/paid-promotions/rate-cards');
  }

  async createPaidPromotionCampaign(
    data: CreatePaidPromotionCampaignRequest
  ): Promise<PaidPromotionCampaign> {
    const response = await this.request<unknown>('/api/v1/paid-promotions/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parsePaidPromotionCampaign(response);
  }

  async getPaidPromotionCampaign(
    campaignId: string,
    options?: { signal?: AbortSignal }
  ): Promise<PaidPromotionCampaign> {
    const response = await this.request<unknown>(
      `/api/v1/paid-promotions/campaigns/${encodeURIComponent(campaignId)}`,
      { signal: options?.signal }
    );
    return parsePaidPromotionCampaign(response);
  }

  async createPaidPromotionCheckoutSession(
    campaignId: string
  ): Promise<PaidPromotionCheckoutSessionResponse> {
    return this.request<PaidPromotionCheckoutSessionResponse>(
      `/api/v1/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/checkout-session`,
      { method: 'POST' }
    );
  }

  async getInternalPaidPromotionCampaigns(params: {
    status?: string;
    paymentStatus?: string;
    hasOpenExceptions?: boolean;
  } = {}): Promise<InternalPaidPromotionCampaignSummary[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
    if (params.hasOpenExceptions != null) {
      query.set('hasOpenExceptions', String(params.hasOpenExceptions));
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalPaidPromotionCampaignSummary[]>(
      `/api/v1/internal/paid-promotions/campaigns${suffix}`,
      { timeoutMs: 20000 }
    );
  }

  async getInternalPaidPromotionCampaign(
    campaignId: string,
    options?: { signal?: AbortSignal }
  ): Promise<InternalPaidPromotionCampaignDetail> {
    return this.request<InternalPaidPromotionCampaignDetail>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}`,
      { timeoutMs: 20000, signal: options?.signal }
    );
  }

  async quoteInternalPaidPromotion(
    campaignId: string,
    rateCardId: string
  ): Promise<InternalPaidPromotionActionResponse> {
    return this.request<InternalPaidPromotionActionResponse>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/quote`,
      {
        method: 'POST',
        body: JSON.stringify({ rateCardId }),
        timeoutMs: 20000,
      }
    );
  }

  async approveInternalPaidPromotion(
    campaignId: string
  ): Promise<InternalPaidPromotionActionResponse> {
    return this.request<InternalPaidPromotionActionResponse>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/approve`,
      { method: 'POST', timeoutMs: 20000 }
    );
  }

  async rejectInternalPaidPromotion(
    campaignId: string
  ): Promise<InternalPaidPromotionActionResponse> {
    return this.request<InternalPaidPromotionActionResponse>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/reject`,
      { method: 'POST', timeoutMs: 20000 }
    );
  }

  async transitionInternalPaidPromotion(
    campaignId: string,
    status: string
  ): Promise<InternalPaidPromotionActionResponse> {
    return this.request<InternalPaidPromotionActionResponse>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/fulfillment`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
        timeoutMs: 20000,
      }
    );
  }

  async getInternalPaidPromotionDeliverables(
    campaignId: string
  ): Promise<InternalPaidPromotionDeliverable[]> {
    return this.request<InternalPaidPromotionDeliverable[]>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/deliverables`,
      { timeoutMs: 20000 }
    );
  }

  async createInternalPaidPromotionDeliverable(
    campaignId: string,
    input: InternalPaidPromotionDeliverableInput
  ): Promise<InternalPaidPromotionDeliverable> {
    return this.request<InternalPaidPromotionDeliverable>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/deliverables`,
      {
        method: 'POST',
        body: JSON.stringify(input),
        timeoutMs: 20000,
      }
    );
  }

  async updateInternalPaidPromotionDeliverable(
    campaignId: string,
    deliverableId: string,
    input: InternalPaidPromotionDeliverableInput
  ): Promise<InternalPaidPromotionDeliverable> {
    return this.request<InternalPaidPromotionDeliverable>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/deliverables/${encodeURIComponent(deliverableId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
        timeoutMs: 20000,
      }
    );
  }

  async removeInternalPaidPromotionDeliverable(
    campaignId: string,
    deliverableId: string
  ): Promise<InternalPaidPromotionDeliverable> {
    return this.request<InternalPaidPromotionDeliverable>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/deliverables/${encodeURIComponent(deliverableId)}`,
      { method: 'DELETE', timeoutMs: 20000 }
    );
  }

  async initiateInternalPaidPromotionRefund(
    campaignId: string,
    amountMinor?: number
  ): Promise<InternalPaidPromotionRefundResponse> {
    return this.request<InternalPaidPromotionRefundResponse>(
      `/api/v1/internal/paid-promotions/campaigns/${encodeURIComponent(campaignId)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify(amountMinor == null ? {} : { amountMinor }),
        timeoutMs: 20000,
      }
    );
  }

  async getInternalPaidPromotionExceptions(params: {
    status?: string;
    kind?: string;
  } = {}): Promise<InternalPaidPromotionException[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.kind) query.set('kind', params.kind);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalPaidPromotionException[]>(
      `/api/v1/internal/paid-promotions/exceptions${suffix}`,
      { timeoutMs: 20000 }
    );
  }

  async getInternalPaidPromotionException(
    exceptionId: string
  ): Promise<InternalPaidPromotionException> {
    return this.request<InternalPaidPromotionException>(
      `/api/v1/internal/paid-promotions/exceptions/${encodeURIComponent(exceptionId)}`,
      { timeoutMs: 20000 }
    );
  }

  async resolveInternalPaidPromotionException(
    exceptionId: string
  ): Promise<InternalPaidPromotionException> {
    return this.request<InternalPaidPromotionException>(
      `/api/v1/internal/paid-promotions/exceptions/${encodeURIComponent(exceptionId)}/resolve`,
      { method: 'POST', timeoutMs: 20000 }
    );
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

  async getInternalSentinelFindings(params: {
    q?: string;
    severity?: string;
    invariantId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<InternalSentinelFindingsResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.severity) query.set('severity', params.severity);
    if (params.invariantId) query.set('invariantId', params.invariantId);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalSentinelFindingsResponse>(`/api/v1/internal/sentinel/findings${suffix}`, {
      timeoutMs: 20000,
    });
  }

  async requestInternalSentinelRescan(
    invariantId?: string,
  ): Promise<InternalSentinelRescanResponse> {
    return this.request<InternalSentinelRescanResponse>(
      '/api/v1/internal/sentinel/rescan',
      {
        method: 'POST',
        body: JSON.stringify(invariantId ? { invariantId } : {}),
        timeoutMs: 20000,
      },
    );
  }

  async revalidateInternalConversionIssues(): Promise<ConversionIssueRevalidationSummary> {
    return this.request<ConversionIssueRevalidationSummary>(
      '/api/v1/internal/conversion-issues/revalidate',
      {
        method: 'POST',
        // Synchronous sweep over every unresolved issue — give it more room
        // than the fire-and-forget rescan before the client-side timeout trips.
        timeoutMs: 60000,
      },
    );
  }

  // Deterministic duplicate-pair merge over unresolved duplicate_stub issues.
  // Dry runs execute the full merge in a transaction and roll back, so the
  // returned counts are real; only dryRun=false commits.
  async adjudicateInternalDuplicates(dryRun: boolean): Promise<StubDuplicateAdjudicationSummary> {
    return this.request<StubDuplicateAdjudicationSummary>(
      '/api/v1/internal/adjudication/duplicates',
      {
        method: 'POST',
        body: JSON.stringify({ dryRun, includeDuplicateStubIssues: true }),
        // Runs the whole merge transaction inline (even for dry runs), so it
        // needs the same headroom as the revalidation sweep.
        timeoutMs: 60000,
      },
    );
  }

  async getInternalSentinelInvariantNotes(): Promise<InternalSentinelInvariantNotesResponse> {
    return this.request<InternalSentinelInvariantNotesResponse>(
      '/api/v1/internal/sentinel/invariants/notes',
      { timeoutMs: 20000 },
    );
  }

  // Saving with every field blank deletes the note; the API answers 204.
  async saveInternalSentinelInvariantNote(
    invariantId: string,
    note: InternalSentinelInvariantNoteInput,
  ): Promise<InternalSentinelInvariantNote | null> {
    return this.request<InternalSentinelInvariantNote | null>(
      `/api/v1/internal/sentinel/invariants/${encodeURIComponent(invariantId)}/note`,
      {
        method: 'PUT',
        body: JSON.stringify(note),
        timeoutMs: 20000,
      },
    );
  }

  async getInternalSentinelRuns(params: {
    q?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<InternalSentinelAuditRunsResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<InternalSentinelAuditRunsResponse>(`/api/v1/internal/sentinel/runs${suffix}`, {
      timeoutMs: 20000,
    });
  }

  async getInternalSentinelInvariantRegistry(): Promise<InternalSentinelInvariantRegistryResponse> {
    return this.request<InternalSentinelInvariantRegistryResponse>('/api/v1/internal/sentinel/invariants', {
      timeoutMs: 20000,
    });
  }

  async getInternalExploreSnapshots(days = 14): Promise<InternalExploreSnapshotsResponse> {
    return this.request<InternalExploreSnapshotsResponse>(
      `/api/v1/internal/explore/snapshots?days=${days}`,
      { timeoutMs: 20000 }
    );
  }

  async getInternalExploreSnapshotItems(
    snapshotId: string,
    limit = 50
  ): Promise<InternalExploreSnapshotItemsResponse> {
    return this.request<InternalExploreSnapshotItemsResponse>(
      `/api/v1/internal/explore/snapshots/${encodeURIComponent(snapshotId)}/items?limit=${limit}`,
      { timeoutMs: 20000 }
    );
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
    content?: string;
    referrerDomain?: string;
  } = {}): Promise<InternalSignupAttributionOverview> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.source) query.set('source', params.source);
    if (params.medium) query.set('medium', params.medium);
    if (params.campaign) query.set('campaign', params.campaign);
    if (params.content) query.set('content', params.content);
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
    content?: string;
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
    if (params.content) query.set('content', params.content);
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
    content?: string;
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
    if (params.content) query.set('content', params.content);
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
    content?: string;
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
    if (params.content) query.set('content', params.content);
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

  // Fetch only viewer-specific post state (like count + liked-by-viewer).
  // Much cheaper than fetchPostById; used to reconcile server-rendered posts.
  async fetchPostViewerState(postId: string, options?: { signal?: AbortSignal }): Promise<PostViewerStateResponse> {
    return this.request<PostViewerStateResponse>(`/api/v1/social/posts/${postId}/viewer-state`, {
      signal: options?.signal,
    });
  }

  async getPostInsights(postId: string, options?: { signal?: AbortSignal }): Promise<PostInsightsResponse> {
    return this.request<PostInsightsResponse>(`/api/v1/social/posts/${postId}/insights`, {
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

  async connectDeezer() {
    return this.request<{ authUrl: string }>('/api/v1/music-services/deezer/init', {
      method: 'POST',
    });
  }

  async handleDeezerCallback(code: string, state: string) {
    return this.request<{ success: boolean }>('/api/v1/music-services/deezer/exchange-code', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  async connectAppleMusic(userToken: string) {
    return this.request<{ success: boolean }>('/api/v1/music-services/apple-music/user-token', {
      method: 'POST',
      body: JSON.stringify({ MusicUserToken: userToken }),
    });
  }

  async createPlaylist(playlistId: string, targetPlatform: string, postId?: string): Promise<CreatePlaylistResponse> {
    const correlationId = createCorrelationId();
    const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]/g, '');
    const targetDefinition = getPlatformDefinition(targetPlatform);
    const targetKey = normalize(targetDefinition?.preferenceKey ?? targetPlatform);
    const canonicalTarget = targetDefinition?.key ?? targetPlatform.toLowerCase();

    // Skip connection check for Spotify if using Cassette's account
    const skipConnectionCheck = targetKey === 'spotify' && clientConfig.features.useCassetteSpotifyAccount;

    if (!skipConnectionCheck) {
      const connections = await this.getMusicConnections();
      const hasConnection = connections.services?.some(service => normalize(service) === targetKey);

      if (!hasConnection) {
        throw new Error('No connection found for target platform');
      }
    }

    return this.request<CreatePlaylistResponse>('/api/v1/convert/createPlaylist', {
      method: 'POST',
      body: JSON.stringify({ PlaylistId: playlistId, TargetPlatform: canonicalTarget, PostId: postId || undefined }),
      correlationId,
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
      return this.request('/api/v1/convert/warmup', { method: 'GET', skipAuth: true, correlationId: createCorrelationId() });
    } catch (error) {
      appLogger.warn('lambda_warmup_failed', {
        correlationId: error instanceof ApiError ? error.correlationId : undefined,
        errorCode: error instanceof ApiError ? error.errorCode : undefined,
      });
    }
  }

  // Issue reporting
  async reportIssue(data: {
    reportType: string;
    sourceContext: string;
    pageUrl?: string;
    sourceLink?: string;
    correlationId?: string;
    conversionJobId?: string;
    sourceLinkHash?: string;
    sourceDomain?: string;
    routeContext?: string;
    description?: string;
    context?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string; issueId?: string; correlationId?: string }> {
    const correlationId = normalizeCorrelationId(data.correlationId) ?? createCorrelationId();
    const sourceLinkHash = data.sourceLinkHash ?? await hashSourceLink(data.sourceLink);
    const sourceDomain = data.sourceDomain ?? getSourceDomain(data.sourceLink);
    const routeContext = normalizeRouteContext(data.routeContext ?? data.pageUrl ?? this.getCurrentRoute());

    void captureClientEvent('issue_report_submitted', {
      route: this.getCurrentRoute(),
      source_surface: this.getCurrentSurface(),
      source_context: data.sourceContext,
      report_type: data.reportType as 'conversion_issue' | 'ui_bug' | 'general_feedback' | 'missing_track' | 'wrong_match',
      has_description: Boolean(data.description && data.description.trim().length > 0),
      has_conversion_context: Boolean(sourceLinkHash || data.conversionJobId),
      correlation_id: correlationId,
      conversion_job_id: data.conversionJobId,
      source_link_hash: sourceLinkHash,
      source_domain: sourceDomain,
      route_context: routeContext,
      status: 'submitted',
      success: false,
    });

    const payload = {
      reportType: data.reportType,
      sourceContext: data.sourceContext,
      routeContext,
      correlationId,
      conversionJobId: data.conversionJobId,
      sourceLinkHash,
      sourceDomain,
      description: data.description,
      context: data.context,
    };

    return this.request('/api/v1/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
      correlationId,
    });
  }
}

export const apiService = new ApiService();
