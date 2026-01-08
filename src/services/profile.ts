import { clientConfig } from '@/lib/config-client';
import { ActivityPost, PaginatedActivityResponse, UserBio } from '@/types';

interface ActivityItemPayload {
  postId: string;
  elementType: string;
  title: string;
  name?: string;
  elementName?: string;
  elementTitle?: string;
  artistName?: string;
  albumName?: string;
  subtitle?: string;
  description?: string;
  caption?: string;
  imageUrl?: string;
  coverArtUrl?: string;
  artworkUrl?: string;
  artwork?: string;
  image?: string;
  details?: {
    coverArtUrl?: string;
    imageUrl?: string;
    artworkUrl?: string;
    artwork?: string;
    title?: string;
    name?: string;
    artist?: string;
    album?: string;
    description?: string;
    caption?: string;
  };
  metadata?: {
    artwork?: string;
  };
  platforms?: Record<string, { artworkUrl?: string; imageUrl?: string; coverArtUrl?: string }>;
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
  // Note: Caching is now handled by React Query (see hooks/use-profile.ts)
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

  private getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
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
          ...this.getAuthHeaders(),
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
          ...this.getAuthHeaders(),
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        const resolveText = (...values: Array<string | null | undefined>) => {
          for (const value of values) {
            if (typeof value === 'string' && value.trim() !== '') {
              return value;
            }
          }
          return undefined;
        };
        const extractTitleFromDescription = (description?: string) => {
          if (!description) return undefined;
          const match = description.match(/Converted\s+(?:Track|Album|Artist|Playlist)\s+-\s+(.+?)\s+from/i);
          return match?.[1]?.trim();
        };
        const resolvePlatformArtwork = (
          platforms?: Record<string, { artworkUrl?: string; imageUrl?: string; coverArtUrl?: string }>
        ) => {
          if (!platforms) return undefined;
          for (const platform of Object.values(platforms)) {
            const artwork = resolveText(platform?.artworkUrl, platform?.imageUrl, platform?.coverArtUrl);
            if (artwork) return artwork;
          }
          return undefined;
        };
        const items: ActivityPost[] =
          json.items?.map((item) => {
            const elementType = item.elementType?.toLowerCase();
            const resolvedDescription = resolveText(
              item.description,
              item.caption,
              item.details?.description,
              item.details?.caption,
            );
            const resolvedTitle = resolveText(
              item.title,
              item.name,
              item.elementTitle,
              item.elementName,
              item.details?.title,
              item.details?.name,
              item.albumName,
              elementType === 'artist' ? item.artistName ?? item.details?.artist ?? item.subtitle : undefined,
              extractTitleFromDescription(resolvedDescription),
            );
            const resolvedSubtitle = resolveText(
              item.subtitle,
              item.details?.artist,
              item.details?.album,
              item.details?.name,
            );
            const resolvedImageUrl = resolveText(
              item.imageUrl,
              item.coverArtUrl,
              item.artworkUrl,
              item.artwork,
              item.image,
              item.details?.coverArtUrl,
              item.details?.imageUrl,
              item.details?.artworkUrl,
              item.details?.artwork,
              item.metadata?.artwork,
              resolvePlatformArtwork(item.platforms),
            );

            return {
              postId: item.postId,
              elementType: item.elementType,
              title: resolvedTitle || 'Untitled',
              subtitle: resolvedSubtitle,
              description: resolvedDescription,
              imageUrl: resolvedImageUrl,
              username: item.username,
              userId: item.userId,
              createdAt: item.createdAt,
            };
          }) ?? [];

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
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<void> {
    try {
      const url = this.buildApiUrl('/api/v1/profile');

      // Backend expects multipart/form-data via [FromForm] attribute
      const formData = new FormData();
      if (data.username) formData.append('Username', data.username);
      if (data.displayName) formData.append('DisplayName', data.displayName);
      if (data.bio !== undefined) formData.append('Bio', data.bio);
      if (data.avatarUrl) formData.append('AvatarUrl', data.avatarUrl);

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: formData,
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
          ...this.getAuthHeaders(),
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
