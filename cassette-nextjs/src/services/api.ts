import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { MusicLinkConversion } from '@/types';

class ApiService {
  private baseUrl = config.api.url;

  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Music conversion endpoints
  async convertMusicLink(url: string): Promise<MusicLinkConversion> {
    return this.request<MusicLinkConversion>('/api/v1/convert', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
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