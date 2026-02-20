import { clientConfig } from '@/lib/config-client';
import { getOrCreateAnonymousId } from '@/lib/analytics/anonymous-id';
import { ProfileAnalyticsResponse } from '@/types';

interface TrackAnalyticsEventResponse {
  recorded: boolean;
  reason?: string;
}

class AnalyticsService {
  private readonly apiBaseUrl = clientConfig.api.url;

  private buildApiUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = this.apiBaseUrl?.trim();

    if (!baseUrl || baseUrl === 'undefined' || baseUrl === 'null') {
      return normalizedPath;
    }

    return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const anonId = getOrCreateAnonymousId();
      if (anonId) {
        headers['X-Anonymous-Id'] = anonId;
      }
    }

    return headers;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(this.buildApiUrl(path), {
      ...init,
      headers: {
        ...this.getHeaders(),
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Analytics request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async trackPostView(postId: string, sourceContext?: string): Promise<TrackAnalyticsEventResponse> {
    return this.request<TrackAnalyticsEventResponse>(`/api/v1/analytics/posts/${encodeURIComponent(postId)}/view`, {
      method: 'POST',
      body: JSON.stringify({ sourceContext }),
    });
  }

  async trackProfileView(userIdentifier: string, sourceContext?: string): Promise<TrackAnalyticsEventResponse> {
    return this.request<TrackAnalyticsEventResponse>(`/api/v1/analytics/profiles/${encodeURIComponent(userIdentifier)}/view`, {
      method: 'POST',
      body: JSON.stringify({ sourceContext }),
    });
  }

  async trackPostClick(
    postId: string,
    platform: string,
    destinationUrl: string,
    sourceContext?: string,
  ): Promise<TrackAnalyticsEventResponse> {
    return this.request<TrackAnalyticsEventResponse>(`/api/v1/analytics/posts/${encodeURIComponent(postId)}/click`, {
      method: 'POST',
      body: JSON.stringify({ platform, destinationUrl, sourceContext }),
    });
  }

  async fetchProfileAnalytics(userIdentifier: string): Promise<ProfileAnalyticsResponse> {
    return this.request<ProfileAnalyticsResponse>(`/api/v1/analytics/profiles/${encodeURIComponent(userIdentifier)}/summary`, {
      method: 'GET',
    });
  }
}

export const analyticsService = new AnalyticsService();
