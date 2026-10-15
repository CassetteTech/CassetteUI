import { useInfiniteQuery, useQuery, useQueryClient, useMutation, type InfiniteData } from '@tanstack/react-query';
import { profileService } from '@/services/profile';
import { UserBio, PaginatedActivityResponse, PaginatedExploreUsersResponse, ExploreCurator, CuratorFeedPage } from '@/types';

export const profileQueryKeys = {
  bio: (userIdentifier: string) => ['user-bio', userIdentifier] as const,
  activity: (userIdentifier: string, page?: number, elementType?: string) =>
    ['user-activity', userIdentifier, page, elementType] as const,
  allActivity: (userIdentifier: string) => ['user-activity', userIdentifier] as const,
  studioActivity: (userId: string | null, slot: 'studio-has-music' | 'studio-artists' | 'studio-members-latest' | 'studio-library') =>
    ['user-activity', userId, slot] as const,
  likedActivity: (userId: string, page?: number) => ['user-liked-activity', userId, page] as const,
  tabProbe: (userIdentifier: string, slot: string) =>
    ['profile-tab-probe', userIdentifier, slot] as const,
  exploreActivity: (page?: number, pageSize?: number, lastSponsoredPostId?: string) =>
    ['explore-activity', page, pageSize, lastSponsoredPostId ?? ''] as const,
  exploreUsers: (page?: number, pageSize?: number, q?: string) =>
    ['explore-users', page, pageSize, q ?? ''] as const,
  exploreCurators: () => ['explore-curators'] as const,
  allCuratorFeeds: () => ['curator-feed'] as const,
  curatorFeed: (viewerId: string | null, membersOnly: boolean) =>
    ['curator-feed', viewerId, membersOnly] as const,
};

interface UserBioQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const useUserBio = (
  userIdentifier: string | undefined,
  options: UserBioQueryOptions = {}
) => {
  const {
    enabled = true,
    staleTime = 1000 * 60 * 5,
    gcTime = 1000 * 60 * 10,
  } = options;

  return useQuery<UserBio, Error>({
    queryKey: profileQueryKeys.bio(userIdentifier ?? ''),
    queryFn: () => profileService.fetchUserBio(userIdentifier!),
    enabled: !!userIdentifier && enabled,
    staleTime,
    gcTime,
    retry: (failureCount, error) => error.message !== 'User not found' && failureCount < 2,
  });
};

interface ActivityQueryOptions {
  page?: number;
  pageSize?: number;
  elementType?: string;
  enabled?: boolean;
}

export const useUserActivity = (
  userIdentifier: string | undefined,
  options: ActivityQueryOptions = {}
) => {
  const { page = 1, pageSize = 20, elementType, enabled = true } = options;

  return useQuery<PaginatedActivityResponse, Error>({
    queryKey: profileQueryKeys.activity(userIdentifier ?? '', page, elementType),
    queryFn: () =>
      profileService.fetchUserActivity(userIdentifier!, { page, pageSize, elementType }),
    enabled: !!userIdentifier && enabled,
    refetchOnMount: 'always',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

export const useUserTracks = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Track' });
};

export const useUserAlbums = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Album' });
};

export const useUserArtists = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Artist' });
};

export const useUserPlaylists = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Playlist' });
};

export const useUserLikedPosts = (
  userId: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  const { page = 1, pageSize = 20, enabled = true } = options;

  return useQuery<PaginatedActivityResponse, Error>({
    queryKey: profileQueryKeys.likedActivity(userId ?? '', page),
    queryFn: () => profileService.fetchUserLikedPosts(userId!, { page, pageSize }),
    enabled: !!userId && enabled,
    refetchOnMount: 'always',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

interface ExploreQueryOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
  q?: string;
  lastSponsoredPostId?: string;
}

export const useExploreActivity = (options: ExploreQueryOptions = {}) => {
  const { page = 1, pageSize = 20, enabled = true, lastSponsoredPostId } = options;

  return useQuery<PaginatedActivityResponse, Error>({
    queryKey: profileQueryKeys.exploreActivity(page, pageSize, lastSponsoredPostId),
    queryFn: () => profileService.fetchExploreActivity({ page, pageSize, lastSponsoredPostId }),
    enabled,
    refetchOnMount: 'always',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

export const useCuratorFeed = (viewerId: string | null, membersOnly: boolean, enabled: boolean) =>
  useInfiniteQuery<
    CuratorFeedPage,
    Error,
    InfiniteData<CuratorFeedPage, string | undefined>,
    ReturnType<typeof profileQueryKeys.curatorFeed>,
    string | undefined
  >({
    queryKey: profileQueryKeys.curatorFeed(viewerId, membersOnly),
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      profileService.fetchCuratorFeed({ cursor: pageParam, membersOnly, signal }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && viewerId !== null,
    staleTime: 1000 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useExploreCurators = () => {
  return useQuery<ExploreCurator[], Error>({
    queryKey: profileQueryKeys.exploreCurators(),
    queryFn: () => profileService.fetchExploreCurators(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

export const useExploreUsers = (options: ExploreQueryOptions = {}) => {
  const { page = 1, pageSize = 20, enabled = true, q } = options;

  return useQuery<PaginatedExploreUsersResponse, Error>({
    queryKey: profileQueryKeys.exploreUsers(page, pageSize, q),
    queryFn: () => profileService.fetchExploreUsers({ page, pageSize, q }),
    enabled,
    refetchOnMount: 'always',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      username?: string;
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      avatarFile?: File | null;
    }) => profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bio'] });
    },
  });
};

export const useCheckUsernameAvailability = (username: string) => {
  return useQuery({
    queryKey: ['username-availability', username],
    queryFn: () => profileService.checkUsernameAvailability(username),
    enabled: !!username && username.length >= 3,
    staleTime: 1000 * 30,
  });
};

export const useInvalidateProfileQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateBio: (userIdentifier: string) =>
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.bio(userIdentifier) }),
    invalidateActivity: (userIdentifier: string) =>
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.allActivity(userIdentifier) }),
    invalidateAll: (userIdentifier: string) => {
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.bio(userIdentifier) });
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.allActivity(userIdentifier) });
    },
  };
};
