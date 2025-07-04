import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { musicService } from '@/services/music';
import { apiService } from '@/services/api';
import { useMusicStore } from '@/stores/music-store';

export const useMusicSearch = (query: string, type?: string) => {
  const { setSearchResults, setIsSearching } = useMusicStore();

  const result = useQuery({
    queryKey: ['music-search', query, type],
    queryFn: () => musicService.searchMusic(query, type),
    enabled: !!query && query.length > 2,
  });

  // Handle success/error manually in useEffect
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

export const useMusicLinkConversion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => musicService.convertMusicLink(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music-search'] });
    },
  });
};

export const useTopCharts = () => {
  return useQuery({
    queryKey: ['top-charts'],
    queryFn: () => musicService.getTopCharts(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useTrack = (id: string) => {
  return useQuery({
    queryKey: ['track', id],
    queryFn: () => musicService.getTrackById(id),
    enabled: !!id,
  });
};

export const useAlbum = (id: string) => {
  return useQuery({
    queryKey: ['album', id],
    queryFn: () => musicService.getAlbumById(id),
    enabled: !!id,
  });
};

export const useArtist = (id: string) => {
  return useQuery({
    queryKey: ['artist', id],
    queryFn: () => musicService.getArtistById(id),
    enabled: !!id,
  });
};

export const usePlaylist = (id: string) => {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => musicService.getPlaylistById(id),
    enabled: !!id,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });
};