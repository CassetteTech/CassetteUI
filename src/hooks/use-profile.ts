import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { profileService } from '@/services/profile';
import { UserBio, PaginatedActivityResponse } from '@/types';

/**
 * Query keys for profile-related queries.
 * Centralized here for easy invalidation.
 */
export const profileQueryKeys = {
  bio: (userIdentifier: string) => ['user-bio', userIdentifier] as const,
  activity: (userIdentifier: string, page?: number, elementType?: string) =>
    ['user-activity', userIdentifier, page, elementType] as const,
  allActivity: (userIdentifier: string) => ['user-activity', userIdentifier] as const,
  likedActivity: (userId: string, page?: number) => ['user-liked-activity', userId, page] as const,
  exploreActivity: (page?: number, pageSize?: number) =>
    ['explore-activity', page, pageSize] as const,
};

/**
 * Fetches a user's bio/profile information.
 * React Query handles deduplication - multiple components can call this
 * with the same userIdentifier and only one network request is made.
 */
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
  });
};

interface ActivityQueryOptions {
  page?: number;
  pageSize?: number;
  elementType?: string;
  enabled?: boolean;
}

/**
 * Fetches a user's activity/posts with pagination.
 * React Query handles deduplication automatically.
 */
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
    staleTime: 1000 * 60 * 2, // 2 minutes (activity changes more frequently)
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetches a user's tracks specifically.
 */
export const useUserTracks = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Track' });
};

/**
 * Fetches a user's albums specifically.
 */
export const useUserAlbums = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Album' });
};

/**
 * Fetches a user's artists specifically.
 */
export const useUserArtists = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Artist' });
};

/**
 * Fetches a user's playlists specifically.
 */
export const useUserPlaylists = (
  userIdentifier: string | undefined,
  options: Omit<ActivityQueryOptions, 'elementType'> = {}
) => {
  return useUserActivity(userIdentifier, { ...options, elementType: 'Playlist' });
};

/**
 * Fetches posts liked by a user.
 */
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
}

export const useExploreActivity = (options: ExploreQueryOptions = {}) => {
  const { page = 1, pageSize = 20, enabled = true } = options;

  return useQuery<PaginatedActivityResponse, Error>({
    queryKey: profileQueryKeys.exploreActivity(page, pageSize),
    queryFn: () => profileService.fetchExploreActivity({ page, pageSize }),
    enabled,
    refetchOnMount: 'always',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
};

/**
 * Mutation hook for updating user profile.
 * Invalidates bio queries on success.
 */
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
      // Invalidate all bio queries to refresh profile data
      queryClient.invalidateQueries({ queryKey: ['user-bio'] });
    },
  });
};

/**
 * Hook to check username availability.
 */
export const useCheckUsernameAvailability = (username: string) => {
  return useQuery({
    queryKey: ['username-availability', username],
    queryFn: () => profileService.checkUsernameAvailability(username),
    enabled: !!username && username.length >= 3,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Helper hook to invalidate profile queries.
 * Useful after mutations that affect profile data.
 */
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
