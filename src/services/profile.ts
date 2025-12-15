import { clientConfig } from '@/lib/config-client';
import { ActivityPost, PaginatedActivityResponse, UserBio } from '@/types';

interface ActivityItemPayload {
  postId: string;
  elementType: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  username: string;
  userId: string;
  createdAt: string;
}

interface ActivityApiResponse {
  items?: ActivityItemPayload[];
  page?: number;
  totalItems?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export class ProfileService {
  private bioCache = new Map<string, { bio: UserBio; timestamp: number }>();
  private activityCache = new Map<string, { activity: PaginatedActivityResponse; timestamp: number }>();
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes
  private readonly apiBaseUrl = clientConfig.api.url;

  private buildApiUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = this.apiBaseUrl?.trim();

    // Some environments set NEXT_PUBLIC_API_URL to literal "undefined"/"null".
    if (!baseUrl || baseUrl === 'undefined' || baseUrl === 'null') {
      return normalizedPath;
    }

    const base = baseUrl.replace(/\/+$/, '');
    return `${base}${normalizedPath}`;
  }

  async fetchUserBio(userIdentifier: string): Promise<UserBio> {
    try {
      const path =
        userIdentifier === 'edit'
          ? '/api/v1/profile/edit/bio'
          : `/api/v1/profile/${userIdentifier}/bio`;

      const url = this.buildApiUrl(path);

      console.log('dY"? Fetching bio from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        return data as UserBio;
      }

      if (response.status === 404) {
        console.log('�?O User not found:', userIdentifier);
        throw new Error('User not found');
      }

      console.log('�?O Error fetching bio:', response.status);
      throw new Error('Failed to load profile');
    } catch (e) {
      console.log('�?O Bio fetch error:', e);
      throw e;
    }
  }

  async fetchUserActivity(
    userIdentifier: string,
    options: {
      page?: number;
      pageSize?: number;
      elementType?: string;
    } = {},
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20, elementType } = options;

      const path =
        userIdentifier === 'edit'
          ? '/api/v1/profile/edit/activity'
          : `/api/v1/profile/${userIdentifier}/activity`;

      const url = this.buildApiUrl(path);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (elementType) {
        queryParams.append('elementType', elementType);
      }

      const requestUrl = `${url}?${queryParams}`;

      console.log('dY"? Fetching activity from:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        const items: ActivityPost[] =
          json.items?.map((item) => ({
            postId: item.postId,
            elementType: item.elementType,
            title: item.title,
            subtitle: item.subtitle,
            imageUrl: item.imageUrl,
            username: item.username,
            userId: item.userId,
            createdAt: item.createdAt,
          })) ?? [];

        return {
          items,
          page: json.page || page,
          totalItems: json.totalItems || 0,
          totalPages: json.totalPages || 0,
          hasNext: json.hasNext || false,
          hasPrevious: json.hasPrevious || false,
        };
      }

      if (response.status === 404) {
        console.log('�?O User not found:', userIdentifier);
        throw new Error('User not found');
      }

      console.log('�?O Error fetching activity:', response.status);
      throw new Error('Failed to load activity');
    } catch (e) {
      console.log('�?O Activity fetch error:', e);
      throw e;
    }
  }

  // Convenience methods for specific element types
  async fetchUserTracks(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Track',
    });
  }

  async fetchUserAlbums(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Album',
    });
  }

  async fetchUserArtists(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedActivityResponse> {
    return this.fetchUserActivity(userIdentifier, {
      ...options,
      elementType: 'Artist',
    });
  }

  async fetchUserPlaylists(
    userIdentifier: string,
    options: { page?: number; pageSize?: number } = {},
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
      const url = this.buildApiUrl('/api/v1/user/profile');

      const response = await fetch(url, {
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
      const url = this.buildApiUrl(`/api/v1/user/check-username/${username}`);

      const response = await fetch(url, {
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
      console.log('�?O Error checking username availability:', e);
      return false;
    }
  }
}

export const profileService = new ProfileService();
