import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { musicService } from '@/services/music';
import { apiService } from '@/services/api';
import { useMusicStore } from '@/stores/music-store';
import { seedArtworkCache } from '@/services/profile-artwork-cache';
import { captureClientEvent } from '@/lib/analytics/client';
import { appLogger } from '@/lib/observability/logger';
import type { PostPrivacy } from '@/types';

function trackPostCreated(
  postId: string | undefined,
  input: {
    elementType?: string;
    musicElementId?: string;
  } = {},
): void {
  if (!postId) {
    return;
  }

  const normalizedElementType = input.elementType?.toLowerCase();
  const elementType =
    normalizedElementType === 'track' ||
    normalizedElementType === 'album' ||
    normalizedElementType === 'artist' ||
    normalizedElementType === 'playlist'
      ? normalizedElementType
      : undefined;

  void captureClientEvent('post_created', {
    post_id: postId,
    music_element_id: input.musicElementId,
    element_type: elementType,
    is_repost: false,
  });
}

export const useMusicSearch = (query: string) => {
  const { setSearchResults, setIsSearching } = useMusicStore();

  const result = useQuery({
    queryKey: ['music-search', query],
    queryFn: () => musicService.searchMusic(query),
    enabled: !!query && query.length >= 2,
  });

  React.useEffect(() => {
    if (result.isSuccess && result.data) {
      setSearchResults(result.data);
      setIsSearching(false);
    }
    if (result.isError) {
      setIsSearching(false);
    }
  }, [result.isSuccess, result.isError, result.data, setSearchResults, setIsSearching]);

  return result;
};

export const useMusicLinkConversion = (options?: { anonymous?: boolean }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { url: string; description?: string; idempotencyKey?: string; anonymous?: boolean; privacy?: PostPrivacy }) => {
      const anonymous = typeof params.anonymous === 'boolean' ? params.anonymous : options?.anonymous;
      appLogger.debug('music_link_conversion_submitted', { anonymous });
      return musicService.convertMusicLink(params.url, { anonymous, description: params.description, idempotencyKey: params.idempotencyKey, privacy: params.privacy });
    },
    onSuccess: (data, variables) => {
      seedArtworkCache(data.postId, data.metadata?.artwork);
      trackPostCreated(data.postId, {
        elementType: data.metadata?.type,
      });
      queryClient.invalidateQueries({ queryKey: ['music-search'] });

      // Lifecycle conversion responses may omit username; infer auth state from request intent.
      const wasAnonymous = typeof variables?.anonymous === 'boolean'
        ? variables.anonymous
        : options?.anonymous === true;
      const shouldRefreshProfile = !wasAnonymous || (typeof data?.username === 'string' && data.username.trim() !== '');

      if (shouldRefreshProfile) {
        queryClient.invalidateQueries({ queryKey: ['user-activity'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['user-bio'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['user-posts'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['profile'], refetchType: 'all' });
      }
    },
    onError: (error) => {
      appLogger.error('music_link_conversion_failed', { error });
    },
  });
};

export const useTopCharts = () => {
  return useQuery({
    queryKey: ['top-charts'],
    queryFn: () => musicService.getTopCharts(),
    staleTime: 1000 * 60 * 15,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiService.createPost(data),
    onSuccess: (data, variables) => {
      const requestData = variables as {
        musicElementId?: string;
        elementType?: string;
      };

      trackPostCreated((data as { postId?: string })?.postId, {
        elementType: requestData.elementType,
        musicElementId: requestData.musicElementId,
      });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });
};

export const useAddMusicToProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      musicElementId: string;
      elementType: string;
      description?: string;
      artworkUrl?: string;
      privacy?: PostPrivacy;
    }) => {
      appLogger.debug('add_music_to_profile_submitted', {
        element_type: params.elementType,
        music_element_id: params.musicElementId,
      });
      return apiService.addToProfile(params.musicElementId, params.elementType, params.description, params.privacy);
    },
    onSuccess: (data, variables) => {
      seedArtworkCache(data.postId, variables.artworkUrl);
      trackPostCreated(data.postId, {
        elementType: variables.elementType,
        musicElementId: variables.musicElementId,
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-activity'], refetchType: 'all' });
    },
    onError: (error) => {
      appLogger.error('add_music_to_profile_failed', { error });
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { postId: string; description?: string; privacy?: string; commentsEnabled?: boolean }) => {
      appLogger.debug('post_update_submitted', { post_id: params.postId });
      return apiService.updatePost(params.postId, {
        description: params.description,
        privacy: params.privacy,
        commentsEnabled: params.commentsEnabled,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['curator-page'] });
    },
    onError: (error) => {
      appLogger.error('post_update_failed', { error });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => {
      appLogger.debug('post_delete_submitted', { post_id: postId });
      return apiService.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['curator-page'] });
    },
    onError: (error) => {
      appLogger.error('post_delete_failed', { error });
    },
  });
};
