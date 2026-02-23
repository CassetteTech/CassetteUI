import { clientConfig } from '@/lib/config-client';
import { ActivityPost, PaginatedActivityResponse, UserBio, PostPrivacy } from '@/types';
import { apiService } from '@/services/api';

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
  userId?: string;
  createdAt: string;
  privacy?: PostPrivacy;
  conversionSuccessCount?: number;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  [key: string]: unknown;
}

interface ActivityApiResponse {
  items?: ActivityItemPayload[];
  data?: ActivityItemPayload[];
  Items?: ActivityItemPayload[];
  Data?: ActivityItemPayload[];
  page?: number;
  pageSize?: number;
  limit?: number;
  Page?: number;
  PageSize?: number;
  Limit?: number;
  totalItems?: number;
  totalCount?: number;
  TotalItems?: number;
  TotalCount?: number;
  totalPages?: number;
  TotalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  HasNext?: boolean;
  HasPrevious?: boolean;
}

export class ProfileService {
  // Note: Caching is now handled by React Query (see hooks/use-profile.ts)
  private readonly apiBaseUrl = clientConfig.api.url;

  private normalizeUserBio(data: Record<string, unknown>): UserBio {
    const nestedUser =
      data.user && typeof data.user === 'object' ? (data.user as Record<string, unknown>) : null;
    const merged = nestedUser ? { ...data, ...nestedUser } : data;
    const likedPostsPrivacyRaw = (
      merged.likedPostsPrivacy ??
      merged.LikedPostsPrivacy ??
      merged.likedPostsVisibility ??
      merged.LikedPostsVisibility ??
      merged.likedPostsTabVisibility ??
      merged.LikedPostsTabVisibility ??
      merged.liked_posts_visibility ??
      merged.liked_posts_privacy ??
      merged.showLikedPosts ??
      merged.ShowLikedPosts ??
      merged.isLikedPostsPublic ??
      merged.IsLikedPostsPublic
    ) as unknown;
    const normalizedLikedPostsPrivacy: 'public' | 'private' | undefined =
      typeof likedPostsPrivacyRaw === 'boolean'
        ? (likedPostsPrivacyRaw ? 'public' : 'private')
        : typeof likedPostsPrivacyRaw === 'string'
          ? likedPostsPrivacyRaw.toLowerCase() === 'private'
            ? 'private'
            : likedPostsPrivacyRaw.toLowerCase() === 'public'
              ? 'public'
              : undefined
          : undefined;
    const rawPlatformPreferences = (merged.platformPreferences ?? merged.PlatformPreferences) as
      | Array<Record<string, unknown>>
      | undefined;
    const platformPreferences = rawPlatformPreferences
      ?.map((pref) => {
        const platformValue = pref.platform ?? pref.Platform;
        if (!platformValue) return null;

        const addedAtValue = pref.addedAt ?? pref.AddedAt;
        return {
          platform: String(platformValue),
          addedAt: String(addedAtValue ?? ''),
        };
      })
      .filter((pref): pref is { platform: string; addedAt: string } => pref !== null);

    return {
      id: String(merged.id || merged.Id || merged.userId || merged.UserId || ''),
      username: String(merged.username || merged.Username || merged.userName || merged.UserName || ''),
      displayName: String(
        merged.displayName ||
          merged.DisplayName ||
          merged.display_name ||
          merged.username ||
          merged.Username ||
          '',
      ),
      bio: String(merged.bio ?? merged.Bio ?? ''),
      avatarUrl: String(
        merged.avatarUrl ||
          merged.AvatarUrl ||
          merged.profilePicture ||
          merged.ProfilePicture ||
          '',
      ),
      isOwnProfile: Boolean(merged.isOwnProfile ?? merged.IsOwnProfile ?? false),
      likedPostsPrivacy: normalizedLikedPostsPrivacy,
      likedPostsVisibility: normalizedLikedPostsPrivacy,
      showLikedPosts: normalizedLikedPostsPrivacy
        ? normalizedLikedPostsPrivacy === 'public'
        : Boolean(merged.showLikedPosts ?? merged.ShowLikedPosts ?? true),
      connectedServices: (merged.connectedServices ||
        merged.ConnectedServiceTypes ||
        merged.ConnectedServices ||
        []) as UserBio['connectedServices'],
      platformPreferences,
      accountType: (merged.accountType ?? merged.AccountType ?? merged.account_type) as UserBio['accountType'],
    };
  }

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

  private mapActivityResponse(
    json: ActivityApiResponse,
    page: number,
    pageSize: number,
  ): PaginatedActivityResponse {
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

    const asObject = (value: unknown): Record<string, unknown> | undefined =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
    const pickString = (obj: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = obj[key];
        if (typeof value === 'string' && value.trim() !== '') {
          return value;
        }
      }
      return undefined;
    };
    const pickNumber = (obj: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = obj[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
      }
      return undefined;
    };
    const pickBoolean = (obj: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = obj[key];
        if (typeof value === 'boolean') {
          return value;
        }
      }
      return undefined;
    };

    const sourceItems = json.items ?? json.data ?? json.Items ?? json.Data ?? [];
    const items: ActivityPost[] =
      sourceItems.map((item) => {
        const itemObj = item as Record<string, unknown>;
        const detailsObj = asObject(itemObj.details);
        const metadataObj = asObject(itemObj.metadata);
        const platformsObj = asObject(itemObj.platforms) as Record<string, { artworkUrl?: string; imageUrl?: string; coverArtUrl?: string }> | undefined;

        const elementType = (
          pickString(itemObj, ['elementType', 'ElementType']) ||
          ''
        ).toLowerCase();
        const resolvedDescription = resolveText(
          pickString(itemObj, ['description', 'Description']),
          pickString(itemObj, ['caption', 'Caption']),
          detailsObj ? pickString(detailsObj, ['description', 'Description']) : undefined,
          detailsObj ? pickString(detailsObj, ['caption', 'Caption']) : undefined,
        );
        const resolvedTitle = resolveText(
          pickString(itemObj, ['title', 'Title']),
          pickString(itemObj, ['name', 'Name']),
          pickString(itemObj, ['elementTitle', 'ElementTitle']),
          pickString(itemObj, ['elementName', 'ElementName']),
          detailsObj ? pickString(detailsObj, ['title', 'Title']) : undefined,
          detailsObj ? pickString(detailsObj, ['name', 'Name']) : undefined,
          pickString(itemObj, ['albumName', 'AlbumName']),
          elementType === 'artist'
            ? (
                pickString(itemObj, ['artistName', 'ArtistName']) ||
                (detailsObj ? pickString(detailsObj, ['artist', 'Artist']) : undefined) ||
                pickString(itemObj, ['subtitle', 'Subtitle'])
              )
            : undefined,
          extractTitleFromDescription(resolvedDescription),
        );
        const resolvedSubtitle = resolveText(
          pickString(itemObj, ['subtitle', 'Subtitle']),
          detailsObj ? pickString(detailsObj, ['artist', 'Artist']) : undefined,
          detailsObj ? pickString(detailsObj, ['album', 'Album']) : undefined,
          detailsObj ? pickString(detailsObj, ['name', 'Name']) : undefined,
        );
        const resolvedImageUrl = resolveText(
          pickString(itemObj, ['imageUrl', 'ImageUrl']),
          pickString(itemObj, ['coverArtUrl', 'CoverArtUrl']),
          pickString(itemObj, ['artworkUrl', 'ArtworkUrl']),
          pickString(itemObj, ['artwork', 'Artwork']),
          pickString(itemObj, ['image', 'Image']),
          detailsObj ? pickString(detailsObj, ['coverArtUrl', 'CoverArtUrl']) : undefined,
          detailsObj ? pickString(detailsObj, ['imageUrl', 'ImageUrl']) : undefined,
          detailsObj ? pickString(detailsObj, ['artworkUrl', 'ArtworkUrl']) : undefined,
          detailsObj ? pickString(detailsObj, ['artwork', 'Artwork']) : undefined,
          metadataObj ? pickString(metadataObj, ['artwork', 'Artwork']) : undefined,
          resolvePlatformArtwork(platformsObj),
        );

        return {
          postId: pickString(itemObj, ['postId', 'PostId']) || '',
          elementType:
            pickString(itemObj, ['elementType', 'ElementType']) ||
            'Track',
          title: resolvedTitle || pickString(itemObj, ['musicElementId', 'MusicElementId']) || 'Untitled',
          subtitle: resolvedSubtitle,
          description: resolvedDescription,
          imageUrl: resolvedImageUrl,
          privacy: (pickString(itemObj, ['privacy', 'Privacy']) as PostPrivacy | undefined) ?? 'public',
          conversionSuccessCount: pickNumber(itemObj, ['conversionSuccessCount', 'ConversionSuccessCount']),
          username: pickString(itemObj, ['username', 'Username']) || 'unknown',
          userId: pickString(itemObj, ['userId', 'UserId']) || '',
          createdAt: pickString(itemObj, ['createdAt', 'CreatedAt']) || '',
          likeCount: pickNumber(itemObj, ['likeCount', 'LikeCount']),
          likedByCurrentUser: pickBoolean(itemObj, ['likedByCurrentUser', 'LikedByCurrentUser']),
        };
      });

    const resolvedPage = json.page ?? json.Page ?? page;
    const resolvedPageSize = json.pageSize ?? json.PageSize ?? json.limit ?? json.Limit ?? pageSize;
    const resolvedTotalItems = json.totalItems ?? json.TotalItems ?? json.totalCount ?? json.TotalCount ?? 0;
    const resolvedTotalPages =
      json.totalPages ??
      json.TotalPages ??
      (resolvedPageSize > 0 ? Math.ceil(resolvedTotalItems / resolvedPageSize) : 0);

    return {
      items,
      page: resolvedPage,
      totalItems: resolvedTotalItems,
      totalPages: resolvedTotalPages,
      hasNext: json.hasNext ?? json.HasNext ?? resolvedPage < resolvedTotalPages,
      hasPrevious: json.hasPrevious ?? json.HasPrevious ?? resolvedPage > 1,
    };
  }

  private async enrichSparseActivityPosts(
    response: PaginatedActivityResponse,
    maxEnrichment = 12,
  ): Promise<PaginatedActivityResponse> {
    const needsEnrichment = (post: ActivityPost) =>
      (!post.title || post.title.trim() === '' || post.title === 'Untitled') ||
      !post.imageUrl ||
      post.imageUrl.trim() === '';

    const candidates = response.items
      .filter((post) => post.postId && needsEnrichment(post))
      .slice(0, maxEnrichment);

    if (candidates.length === 0) {
      return response;
    }

    const overrides = new Map<string, Partial<ActivityPost>>();

    await Promise.all(
      candidates.map(async (post) => {
        try {
          const full = await apiService.fetchPostById(post.postId);
          if (!full?.success) return;

          const title = full.details?.title || full.details?.name || post.title || 'Untitled';
          const subtitle = full.details?.artist || full.details?.album || post.subtitle;
          const imageUrl =
            full.details?.coverArtUrl ||
            full.details?.imageUrl ||
            Object.values(full.platforms || {}).find((p) => p?.artworkUrl)?.artworkUrl ||
            post.imageUrl;

          overrides.set(post.postId, {
            title,
            subtitle,
            imageUrl,
          });
        } catch {
          // Best-effort hydration
        }
      }),
    );

    if (overrides.size === 0) {
      return response;
    }

    return {
      ...response,
      items: response.items.map((post) => ({
        ...post,
        ...(overrides.get(post.postId) || {}),
      })),
    };
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
        const data = (await response.json()) as Record<string, unknown>;
        return this.normalizeUserBio(data);
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
        return this.mapActivityResponse(json, page, pageSize);
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

  async fetchExploreActivity(
    options: {
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20 } = options;
      const path = '/api/v1/social/explore';
      const url = this.buildApiUrl(path);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const requestUrl = `${url}?${queryParams}`;

      console.log('dY"? Fetching explore activity from:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        return this.mapActivityResponse(json, page, pageSize);
      }

      console.log('�?O Error fetching explore activity:', response.status);
      throw new Error('Failed to load explore activity');
    } catch (e) {
      console.log('�?O Explore activity fetch error:', e);
      throw e;
    }
  }

  async fetchUserLikedPosts(
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20 } = options;
      const path = `/api/v1/social/users/${userId}/liked-posts`;
      const url = this.buildApiUrl(path);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const requestUrl = `${url}?${queryParams}`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        const mapped = this.mapActivityResponse(json, page, pageSize);
        return this.enrichSparseActivityPosts(mapped);
      }

      if (response.status === 404) {
        throw new Error('User not found');
      }
      if (response.status === 403) {
        throw new Error('Liked posts are private');
      }

      throw new Error('Failed to load liked posts');
    } catch (e) {
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
    avatarFile?: File | null;
    likedPostsPrivacy?: 'public' | 'private';
  }): Promise<void> {
    try {
      const url = this.buildApiUrl('/api/v1/profile');

      // Backend expects multipart/form-data via [FromForm] attribute
      const formData = new FormData();
      if (data.username) formData.append('Username', data.username.trim().toLowerCase());
      if (data.displayName) formData.append('DisplayName', data.displayName);
      if (data.bio !== undefined) formData.append('Bio', data.bio);
      if (data.avatarFile) {
        formData.append('avatar', data.avatarFile, data.avatarFile.name);
        formData.append('Avatar', data.avatarFile, data.avatarFile.name);
      }
      if (data.avatarUrl && !data.avatarFile) formData.append('AvatarUrl', data.avatarUrl);
      if (data.likedPostsPrivacy) {
        formData.append('likedPostsPrivacy', data.likedPostsPrivacy);
        // Compatibility fallback for older servers
        formData.append('showLikedPosts', String(data.likedPostsPrivacy === 'public'));
      }

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
      const normalized = username.trim().toLowerCase();
      const url = this.buildApiUrl(`/api/v1/user/check-username/${normalized}`);

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
