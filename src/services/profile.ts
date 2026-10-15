import {
  ActivityPost,
  ExploreCurator,
  ExploreUser,
  PaginatedActivityResponse,
  PaginatedExploreUsersResponse,
  PostPrivacy,
  SponsoredExplorePlacement,
  CuratorFeedItem,
  CuratorFeedPage,
  UserBio,
} from '@/types';
import { z } from 'zod';
import { getBrowserApiBaseUrl } from '@/lib/utils/url';
import { appLogger } from '@/lib/observability/logger';
import {
  normalizeConnectedServicePayload,
  normalizeStreamingServiceType,
} from '@/utils/platform-normalization';
import { normalizeSponsoredExplorePlacementEnvelope } from './sponsored-explore-contract';
import { accountTypeSchema } from '../lib/account-type';

const activityItemPayloadSchema = z.record(z.string(), z.unknown());

type ActivityItemPayload = z.infer<typeof activityItemPayloadSchema>;

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
  sponsoredPlacement?: unknown;
  SponsoredPlacement?: unknown;
}

const feedCount = z.number().int().nonnegative();

// The feed metadata drives paging and the empty states, so a response without
// it is an error, never an empty feed. Each count is checked on its own: Bridge
// counts them in separate statements, so they can briefly disagree. A full
// post keeps the activity mapping; a locked row is exact, because an added
// field on it would carry the post's content to a viewer without access.
const curatorFeedPageSchema = z.object({
  items: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('post'), post: activityItemPayloadSchema }).strict(),
    z.object({
      kind: z.literal('locked'),
      postId: z.string().min(1),
      createdAt: z.string().datetime({ offset: true }),
      curator: z.object({
        id: z.string().min(1),
        username: z.string().min(1),
        displayName: z.string().nullable(),
        avatarUrl: z.string().nullable(),
      }).strict(),
    }).strict(),
  ])),
  nextCursor: z.string().min(1).nullable(),
  activeMembershipCount: feedCount,
  feedCuratorCount: feedCount,
});

interface ExploreUserPayload {
  userId?: string;
  UserId?: string;
  username?: string;
  Username?: string;
  displayName?: string;
  DisplayName?: string;
  avatarUrl?: string;
  AvatarUrl?: string;
  profilePicture?: string;
  ProfilePicture?: string;
  accountType?: string | number;
  AccountType?: string | number;
  latestExplorePostAt?: string;
  LatestExplorePostAt?: string;
  [key: string]: unknown;
}

interface ExploreUsersApiResponse {
  users?: ExploreUserPayload[];
  Users?: ExploreUserPayload[];
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
  totalItems?: number;
  TotalItems?: number;
  totalPages?: number;
  TotalPages?: number;
  hasNext?: boolean;
  HasNext?: boolean;
  hasPrevious?: boolean;
  HasPrevious?: boolean;
}

export class ProfileService {
  private readonly apiBaseUrl = getBrowserApiBaseUrl();

  private firstArrayCandidate(...values: unknown[]): unknown[] | undefined {
    let firstArray: unknown[] | undefined;

    for (const value of values) {
      if (!Array.isArray(value)) {
        continue;
      }

      firstArray ??= value;
      if (value.length > 0) {
        return value;
      }
    }

    return firstArray;
  }

  private normalizePlatformName(value: unknown): string {
    return normalizeStreamingServiceType(value);
  }

  private normalizeConnectedServices(value: unknown): UserBio['connectedServices'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((service) => {
        return normalizeConnectedServicePayload(service, '');
      })
      .filter((service): service is UserBio['connectedServices'][number] => service !== null);
  }

  private normalizePlatformPreferences(value: unknown): UserBio['platformPreferences'] {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const normalized = value
      .map((preference) => {
        if (typeof preference === 'string' || typeof preference === 'number') {
          const platform = this.normalizePlatformName(preference);
          if (!platform) return null;

          return {
            platform,
            addedAt: '',
          };
        }

        if (!preference || typeof preference !== 'object') {
          return null;
        }

        const payload = preference as Record<string, unknown>;
        const platform = this.normalizePlatformName(payload.platform ?? payload.Platform);
        if (!platform) {
          return null;
        }

        const addedAt = payload.addedAt ?? payload.AddedAt;
        return {
          platform,
          addedAt: typeof addedAt === 'string' ? addedAt : '',
        };
      })
      .filter((preference): preference is NonNullable<UserBio['platformPreferences']>[number] => preference !== null);

    return normalized.length > 0 ? normalized : undefined;
  }

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
    const platformPreferences = this.normalizePlatformPreferences(
      this.firstArrayCandidate(merged.platformPreferences, merged.PlatformPreferences),
    );
    const connectedServices = this.normalizeConnectedServices(
      this.firstArrayCandidate(
        merged.connectedServices,
        merged.ConnectedServiceTypes,
        merged.ConnectedServices,
      ),
    );

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
      totalLikesReceived: Number(
        merged.totalLikesReceived ??
        merged.TotalLikesReceived ??
        merged.total_likes_received ??
        0
      ) || 0,
      connectedServices,
      platformPreferences,
      profileLinks: (this.firstArrayCandidate(merged.profileLinks, merged.ProfileLinks) ?? []).filter(
        (link): link is string => typeof link === 'string' && link.length > 0,
      ),
      accountType: accountTypeSchema.parse(merged.accountType ?? merged.AccountType ?? merged.account_type),
    };
  }

  private buildApiUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBaseUrl.replace(/\/+$/, '')}${normalizedPath}`;
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
      sourceItems.map((itemObj) => {
        const detailsObj = asObject(itemObj.details);
        const metadataObj = asObject(itemObj.metadata);
        const originalPostObj = asObject(itemObj.originalPost) || asObject(itemObj.OriginalPost);
        const originalOwnerObj = asObject(itemObj.originalOwner) || asObject(itemObj.OriginalOwner);
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
          redirectPostId:
            pickString(itemObj, ['redirectPostId', 'RedirectPostId']) ||
            pickString(itemObj, ['postId', 'PostId']) ||
            '',
          isRepost:
            pickBoolean(itemObj, ['isRepost', 'IsRepost']) ||
            false,
          originalPostId:
            pickString(itemObj, ['originalPostId', 'OriginalPostId']) || null,
          originalUsername:
            pickString(itemObj, [
              'originalPostOwnerUsername',
              'OriginalPostOwnerUsername',
              'originalUsername',
              'OriginalUsername',
              'originalPostUsername',
              'OriginalPostUsername',
              'sourceUsername',
              'SourceUsername',
            ]) ||
            (originalPostObj ? pickString(originalPostObj, ['username', 'Username', 'userName', 'UserName']) : undefined) ||
            (originalOwnerObj ? pickString(originalOwnerObj, ['username', 'Username', 'userName', 'UserName']) : undefined) ||
            '',
          originalPostOwnerUserId:
            pickString(itemObj, ['originalPostOwnerUserId', 'OriginalPostOwnerUserId']) ||
            (originalOwnerObj ? pickString(originalOwnerObj, ['userId', 'UserId', 'id', 'Id']) : undefined) ||
            null,
          originalPostOwnerUsername:
            pickString(itemObj, ['originalPostOwnerUsername', 'OriginalPostOwnerUsername']) ||
            (originalOwnerObj ? pickString(originalOwnerObj, ['username', 'Username', 'userName', 'UserName']) : undefined) ||
            null,
          originalPostOwnerAvatarUrl:
            pickString(itemObj, ['originalPostOwnerAvatarUrl', 'OriginalPostOwnerAvatarUrl']) ||
            (originalOwnerObj ? pickString(originalOwnerObj, ['avatarUrl', 'AvatarUrl', 'profilePicture', 'ProfilePicture']) : undefined) ||
            null,
          originalPostOwnerAccountType: accountTypeSchema.parse(
            pickString(itemObj, ['originalPostOwnerAccountType', 'OriginalPostOwnerAccountType']) ??
            pickNumber(itemObj, ['originalPostOwnerAccountType', 'OriginalPostOwnerAccountType']) ??
            (originalOwnerObj
              ? (
                  pickString(originalOwnerObj, ['accountType', 'AccountType']) ??
                  pickNumber(originalOwnerObj, ['accountType', 'AccountType'])
                )
              : undefined),
          ) ?? null,
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
          commentsEnabled: pickBoolean(itemObj, ['commentsEnabled', 'CommentsEnabled']),
          accountType: accountTypeSchema.parse(
            pickString(itemObj, ['accountType', 'AccountType']) ??
            pickNumber(itemObj, ['accountType', 'AccountType']),
          ),
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

  private mapSponsoredExplorePlacement(
    json: ActivityApiResponse,
  ): SponsoredExplorePlacement | undefined {
    const envelope = normalizeSponsoredExplorePlacementEnvelope(
      json.sponsoredPlacement ?? json.SponsoredPlacement,
    );
    if (!envelope) {
      return undefined;
    }

    const post = this.mapActivityResponse(
      { items: [envelope.postPayload] },
      1,
      1,
    ).items[0];
    if (!post?.postId) {
      return undefined;
    }

    return {
      placementType: 'sponsored_explore',
      label: envelope.label,
      post,
    };
  }

  async fetchUserBio(userIdentifier: string): Promise<UserBio> {
    try {
      const path =
        userIdentifier === 'edit'
          ? '/api/v1/profile/edit/bio'
          : `/api/v1/profile/${userIdentifier}/bio`;

      const url = this.buildApiUrl(path);

      appLogger.debug('profile_bio_fetch_started');

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const data = (await response.json()) as Record<string, unknown>;
        return this.normalizeUserBio(data);
      }

      if (response.status === 404) {
        appLogger.warn('profile_bio_not_found');
        throw new Error('User not found');
      }

      appLogger.warn('profile_bio_fetch_failed', { status: response.status });
      throw new Error('Failed to load profile');
    } catch (e) {
      appLogger.warn('profile_bio_fetch_error', { error: e });
      throw e;
    }
  }

  async fetchUserActivity(
    userIdentifier: string,
    options: {
      page?: number;
      pageSize?: number;
      elementType?: string;
      privacy?: 'public' | 'subscriber' | 'private';
    } = {},
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20, elementType, privacy } = options;

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
      if (privacy) {
        queryParams.append('privacy', privacy);
      }

      const requestUrl = `${url}?${queryParams}`;

      appLogger.debug('profile_activity_fetch_started', { page, pageSize, element_type: elementType });

      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        return this.mapActivityResponse(json, page, pageSize);
      }

      if (response.status === 404) {
        appLogger.warn('profile_activity_not_found');
        throw new Error('User not found');
      }

      appLogger.warn('profile_activity_fetch_failed', { status: response.status });
      throw new Error('Failed to load activity');
    } catch (e) {
      appLogger.warn('profile_activity_fetch_error', { error: e });
      throw e;
    }
  }

  async fetchExploreActivity(
    options: {
      page?: number;
      pageSize?: number;
      lastSponsoredPostId?: string;
    } = {},
  ): Promise<PaginatedActivityResponse> {
    try {
      const { page = 1, pageSize = 20, lastSponsoredPostId } = options;
      const path = '/api/v1/social/explore';
      const url = this.buildApiUrl(path);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (page === 1 && lastSponsoredPostId) {
        queryParams.set('lastSponsoredPostId', lastSponsoredPostId);
      }

      const requestUrl = `${url}?${queryParams}`;

      appLogger.debug('explore_activity_fetch_started', { page, pageSize });

      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        return {
          ...this.mapActivityResponse(json, page, pageSize),
          sponsoredPlacement: this.mapSponsoredExplorePlacement(json),
        };
      }

      appLogger.warn('explore_activity_fetch_failed', { status: response.status });
      throw new Error('Failed to load explore activity');
    } catch (e) {
      appLogger.warn('explore_activity_fetch_error', { error: e });
      throw e;
    }
  }

  async fetchCuratorFeed(
    options: { cursor?: string; pageSize?: number; membersOnly?: boolean; signal?: AbortSignal } = {},
  ): Promise<CuratorFeedPage> {
    const { cursor, pageSize = 20, membersOnly = false, signal } = options;
    const queryParams = new URLSearchParams({ pageSize: pageSize.toString() });
    if (cursor) queryParams.set('cursor', cursor);
    if (membersOnly) queryParams.set('membersOnly', 'true');

    const response = await fetch(`${this.buildApiUrl('/api/v1/social/feed/posts')}?${queryParams}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
    });
    if (response.status !== 200) {
      appLogger.warn('curator_feed_fetch_failed', { status: response.status });
      throw new Error('Failed to load the Feed');
    }

    const parsed = curatorFeedPageSchema.safeParse(await response.json());
    if (!parsed.success) {
      appLogger.warn('curator_feed_response_invalid', { issues: parsed.error.issues.length });
      throw new Error('Failed to load the Feed');
    }
    const { items, nextCursor, activeMembershipCount, feedCuratorCount } = parsed.data;
    const posts = this.mapActivityResponse(
      { items: items.flatMap((item) => (item.kind === 'post' ? [item.post] : [])) },
      1,
      pageSize,
    ).items;
    let postIndex = 0;
    return {
      items: items.map((item): CuratorFeedItem =>
        item.kind === 'post' ? { kind: 'post', post: posts[postIndex++] } : item),
      nextCursor,
      activeMembershipCount,
      feedCuratorCount,
    };
  }

  async fetchExploreUsers(
    options: {
      page?: number;
      pageSize?: number;
      q?: string;
    } = {},
  ): Promise<PaginatedExploreUsersResponse> {
    try {
      const { page = 1, pageSize = 20, q } = options;
      const path = '/api/v1/social/explore/users';
      const url = this.buildApiUrl(path);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const normalizedQuery = q?.trim();
      if (normalizedQuery) {
        queryParams.set('q', normalizedQuery);
      }

      const requestUrl = `${url}?${queryParams}`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ExploreUsersApiResponse;
        const sourceUsers = json.users ?? json.Users ?? [];

        const users: ExploreUser[] = sourceUsers.map((user) => {
          const userObj = user as Record<string, unknown>;
          const pickString = (keys: string[]) => {
            for (const key of keys) {
              const value = userObj[key];
              if (typeof value === 'string' && value.trim() !== '') {
                return value;
              }
            }
            return undefined;
          };
          const pickNumber = (keys: string[]) => {
            for (const key of keys) {
              const value = userObj[key];
              if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
              }
            }
            return undefined;
          };

          return {
            userId: pickString(['userId', 'UserId']) || '',
            username: pickString(['username', 'Username']) || 'unknown',
            displayName: pickString(['displayName', 'DisplayName']),
            avatarUrl: pickString(['avatarUrl', 'AvatarUrl', 'profilePicture', 'ProfilePicture']),
            accountType: accountTypeSchema.parse(
              pickString(['accountType', 'AccountType']) ??
              pickNumber(['accountType', 'AccountType']),
            ),
            latestExplorePostAt: pickString(['latestExplorePostAt', 'LatestExplorePostAt']),
          };
        });

        const resolvedPage = json.page ?? json.Page ?? page;
        const resolvedPageSize = json.pageSize ?? json.PageSize ?? pageSize;
        const resolvedTotalItems = json.totalItems ?? json.TotalItems ?? users.length;
        const resolvedTotalPages =
          json.totalPages ??
          json.TotalPages ??
          (resolvedPageSize > 0 ? Math.ceil(resolvedTotalItems / resolvedPageSize) : 0);

        return {
          users,
          page: resolvedPage,
          pageSize: resolvedPageSize,
          totalItems: resolvedTotalItems,
          totalPages: resolvedTotalPages,
          hasNext: json.hasNext ?? json.HasNext ?? resolvedPage < resolvedTotalPages,
          hasPrevious: json.hasPrevious ?? json.HasPrevious ?? resolvedPage > 1,
        };
      }

      throw new Error('Failed to load explore users');
    } catch (e) {
      throw e;
    }
  }

  async fetchExploreCurators(): Promise<ExploreCurator[]> {
    const url = this.buildApiUrl('/api/v1/social/explore/curators');

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      appLogger.warn('explore_curators_fetch_failed', { status: response.status });
      throw new Error('Failed to load explore curators');
    }

    const json = (await response.json()) as {
      curators?: ExploreCurator[];
      Curators?: ExploreCurator[];
    };
    return (json.curators ?? json.Curators ?? []).map((curator) => ({
      ...curator,
      recentArtworkUrls: curator.recentArtworkUrls ?? [],
      profileLinks:
        curator.profileLinks ?? (curator as { ProfileLinks?: string[] }).ProfileLinks ?? [],
      topGenres: curator.topGenres ?? (curator as { TopGenres?: string[] }).TopGenres ?? [],
      hasActiveMembershipPlan: curator.hasActiveMembershipPlan === true,
      accountType: accountTypeSchema.parse(curator.accountType),
    }));
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const json = (await response.json()) as ActivityApiResponse;
        return this.mapActivityResponse(json, page, pageSize);
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
    profileLinks?: string[];
  }): Promise<void> {
    try {
      const url = this.buildApiUrl('/api/v1/profile');

      const formData = new FormData();
      if (data.username) formData.append('Username', data.username.trim().toLowerCase());
      if (data.displayName) formData.append('DisplayName', data.displayName);
      if (data.bio !== undefined) formData.append('Bio', data.bio);
      if (data.avatarFile) {
        formData.append('avatar', data.avatarFile, data.avatarFile.name);
        formData.append('Avatar', data.avatarFile, data.avatarFile.name);
      }
      if (data.avatarUrl && !data.avatarFile) formData.append('AvatarUrl', data.avatarUrl);
      if (data.likedPostsPrivacy) formData.append('likedPostsPrivacy', data.likedPostsPrivacy);
      if (data.profileLinks !== undefined) {
        // Whole-list replace; the server treats a single blank entry as "clear all"
        // since multipart forms cannot express an empty list.
        if (data.profileLinks.length === 0) {
          formData.append('ProfileLinks', '');
        } else {
          for (const link of data.profileLinks) {
            formData.append('ProfileLinks', link);
          }
        }
      }

      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      if (response.status !== 200) {
        const result = await response.json().catch(() => null) as {
          errorCode?: unknown;
          error_code?: unknown;
        } | null;
        const rawErrorCode = result?.errorCode ?? result?.error_code;
        const requestError = new Error(
          response.status === 400 || response.status === 422
            ? 'Check your profile details and try again.'
            : 'Failed to update profile',
        ) as Error & { status?: number; errorCode?: string };
        requestError.status = response.status;
        requestError.errorCode = typeof rawErrorCode === 'string' ? rawErrorCode : undefined;
        throw requestError;
      }

      const result = await response.json() as { success?: boolean };
      if (!result.success) {
        throw new Error('Failed to save profile. Please try again.');
      }
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error('Failed to update profile');
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const normalized = username.trim().toLowerCase();
      const url = this.buildApiUrl(`/api/v1/user/check-username/${normalized}`);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        const data = await response.json() as { available?: unknown };
        if (typeof data.available === 'boolean') {
          return data.available;
        }
      }

      throw new Error('Username availability check failed');
    } catch (e) {
      appLogger.warn('username_availability_check_failed', { error: e });
      throw e;
    }
  }
}

export const profileService = new ProfileService();
