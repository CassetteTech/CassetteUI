import { config } from '@/lib/config';
import { UserBio, PaginatedActivityResponse, ActivityPost, ConnectedService } from '@/types';

export class ProfileService {
  private bioCache = new Map<string, { bio: UserBio; timestamp: number }>();
  private activityCache = new Map<string, { activity: PaginatedActivityResponse; timestamp: number }>();
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  private resolveApiBaseUrl(): string {
    const baseUrl = config.api.url || process.env.NEXT_PUBLIC_API_URL || '';
    return baseUrl.replace(/\/$/, '');
  }

  private buildUrl(path: string, query?: URLSearchParams): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.apiBaseUrl || '';

    if (!base) {
      return query ? `${normalizedPath}?${query}` : normalizedPath;
    }

    const url = new URL(normalizedPath, `${base}/`);

    if (query) {
      query.forEach((value, key) => url.searchParams.set(key, value));
    }

    return url.toString();
  }

  private async parseJson<T>(response: Response): Promise<T | null> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON response:', error);
      return null;
    }
  }

  private normalizeUserBio(raw: unknown, fallbackIdentifier: string, isOwnProfileOverride?: boolean): UserBio {
    const base: Partial<UserBio> = {
      id: fallbackIdentifier,
      username: fallbackIdentifier,
      displayName: fallbackIdentifier,
      bio: '',
      avatarUrl: '',
      isOwnProfile: false,
      connectedServices: [],
    };

    if (!raw || typeof raw !== 'object') {
      return base as UserBio;
    }

    const data = raw as Record<string, unknown>;

    const id = (typeof data.id === 'string' && data.id) ||
      (typeof data.userId === 'string' && data.userId) ||
      fallbackIdentifier;

    const connectedServicesRaw = Array.isArray(data.connectedServices)
      ? data.connectedServices.filter(Boolean)
      : [];

    const connectedServices: ConnectedService[] = connectedServicesRaw.map((service) => {
      const svc = service as Record<string, unknown>;
      return {
        serviceType: String(svc.serviceType ?? ''),
        connectedAt: String(svc.connectedAt ?? ''),
        profileUrl: svc.profileUrl ? String(svc.profileUrl) : undefined,
      };
    });

    return {
      id,
      username: typeof data.username === 'string' ? data.username : fallbackIdentifier,
      displayName: typeof data.displayName === 'string'
        ? data.displayName
        : typeof data.username === 'string'
          ? data.username
          : fallbackIdentifier,
      bio: typeof data.bio === 'string' ? data.bio : '',
      avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
      isOwnProfile: typeof isOwnProfileOverride === 'boolean'
        ? isOwnProfileOverride
        : Boolean(data.isOwnProfile),
      connectedServices,
    };
  }

  private normalizeActivityItem(raw: unknown): ActivityPost | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const data = raw as Record<string, unknown>;
    const elementType = typeof data.elementType === 'string' ? data.elementType : '';

    return {
      postId: String(data.postId ?? ''),
      elementType,
      title: String(data.title ?? ''),
      subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
      imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
      username: String(data.username ?? ''),
      userId: String(data.userId ?? ''),
      createdAt: String(data.createdAt ?? ''),
    };
  }

  private normalizeActivityResponse(
    raw: unknown,
    overrides?: Partial<PaginatedActivityResponse>
  ): PaginatedActivityResponse {
    const base: PaginatedActivityResponse = {
      items: [],
      page: overrides?.page ?? 1,
      totalItems: overrides?.totalItems ?? 0,
      totalPages: overrides?.totalPages ?? 0,
      hasNext: overrides?.hasNext ?? false,
      hasPrevious: overrides?.hasPrevious ?? false,
      isOwnProfile: overrides?.isOwnProfile ?? false,
    };

    if (!raw || typeof raw !== 'object') {
      return base;
    }

    const data = raw as Record<string, unknown>;
    const itemsRaw = Array.isArray(data.items) ? data.items : [];

    const items = itemsRaw
      .map((item) => this.normalizeActivityItem(item))
      .filter((item): item is ActivityPost => item !== null);

    return {
      items,
      page: typeof data.page === 'number' ? data.page : base.page,
      totalItems: typeof data.totalItems === 'number' ? data.totalItems : items.length,
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : base.totalPages,
      hasNext: typeof data.hasNext === 'boolean' ? data.hasNext : base.hasNext,
      hasPrevious: typeof data.hasPrevious === 'boolean' ? data.hasPrevious : base.hasPrevious,
      isOwnProfile: typeof data.isOwnProfile === 'boolean' ? data.isOwnProfile : base.isOwnProfile,
    };
  }

  async fetchUserBio(userIdentifier: string): Promise<UserBio> {
    try {
      // Handle edit path
      const path = userIdentifier === 'edit' 
        ? '/api/v1.0/profile/edit/bio' 
        : `/api/v1.0/profile/${userIdentifier}/bio`;

      console.log('🔍 Fetching bio from:', path);
      
      const response = await fetch(this.buildUrl(path), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      const data = await this.parseJson<unknown>(response);

      if (response.status === 200) {
        return this.normalizeUserBio(data, userIdentifier);
      } else if (response.status === 404) {
        console.log('❌ User not found:', userIdentifier);
        throw new Error('User not found');
      } else if (response.status === 401 || response.status === 403) {
        console.log('⚠️ Bio fetch unauthorized, falling back to view-only mode');
        return this.normalizeUserBio(data, userIdentifier, false);
      }

      console.log('❌ Error fetching bio:', response.status);
      throw new Error('Failed to load profile');
    } catch (e) {
      console.log('❌ Bio fetch error:', e);
      throw e;
    }
  }

  async fetchUserActivity(
    userIdentifier: string,
    options: {
      page?: number;
      pageSize?: number;
      elementType?: string;
    } = {}
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20, elementType } = options;
      
      // Handle edit path
      const path = userIdentifier === 'edit'
        ? '/api/v1.0/profile/edit/activity'
        : `/api/v1.0/profile/${userIdentifier}/activity`;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (elementType) {
        queryParams.append('elementType', elementType);
      }

      const url = this.buildUrl(path, queryParams);
      
      console.log('🔍 Fetching activity from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      const data = await this.parseJson<unknown>(response);

      if (response.status === 200) {
        return this.normalizeActivityResponse(data);
      } else if (response.status === 404) {
        console.log('❌ User not found:', userIdentifier);
        throw new Error('User not found');
      } else if (response.status === 401 || response.status === 403) {
        console.log('⚠️ Activity fetch unauthorized, falling back to public data');
        return this.normalizeActivityResponse(data, {
          page,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
          isOwnProfile: false,
        });
      }

      console.log('❌ Error fetching activity:', response.status);
      throw new Error('Failed to load activity');
    } catch (e) {
      console.log('❌ Activity fetch error:', e);
      throw e;
    }
  }

  // Convenience methods for specific element types
  async fetchUserTracks(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Track',
    });
  }

  async fetchUserAlbums(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Album',
    });
  }

  async fetchUserArtists(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Artist',
    });
  }

  async fetchUserPlaylists(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Playlist',
    });
  }

  async updateProfile(data: {
    username?: string;
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_LOCAL}/api/v1.0/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify(data),
      });

      if (response.status !== 200) {
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update profile');
      }
    } catch (e) {
      throw new Error(`Error updating profile: ${e}`);
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_LOCAL}/api/v1.0/user/check-username/${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.available;
      }
      return false;
    } catch (e) {
      console.log('❌ Error checking username availability:', e);
      return false;
    }
  }
}

export const profileService = new ProfileService();
