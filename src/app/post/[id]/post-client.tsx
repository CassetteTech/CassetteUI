'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { StreamingLinks, streamingServices } from '@/components/features/entity/streaming-links';
import { PlaylistStreamingLinks } from '@/components/features/entity/playlist-streaming-links';
import { PlayPreview } from '@/components/features/entity/play-preview';
import { TrackList } from '@/components/features/entity/track-list';
import { PostDescriptionCard } from '@/components/features/post/post-description-card';
import { PostCommentsCard } from '@/components/features/post/post-comments-card';
import { EditPostModal } from '@/components/features/post/edit-post-modal';
import { DeletePostModal } from '@/components/features/post/delete-post-modal';
import { AuthPromptModal } from '@/components/features/auth-prompt-modal';
import { useReportIssue } from '@/providers/report-issue-provider';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AnimatedColorBackground } from '@/components/ui/animated-color-background';
import { ColorExtractor, ColorPalette } from '@/services/color-extractor';
import { MainContainer } from '@/components/ui/container';
import { HeadlineText, BodyText, UIText } from '@/components/ui/typography';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, apiService } from '@/services/api';
import { useAddMusicToProfile } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { AlertCircle, Check, Copy, ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';
import { detectContentType } from '@/utils/content-type-detection';
import { captureClientEvent } from '@/lib/analytics/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type JoinCassetteCTAProps = {
  onClick: () => void;
  className?: string;
  accentColor?: string | null;
};

function JoinCassetteCTA({ onClick, className }: Omit<JoinCassetteCTAProps, 'accentColor'>) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className ?? ''}`}>
      <p className="text-sm text-muted-foreground">
        <span className="text-foreground font-medium">New here?</span> Create a free account to save your music.
      </p>
      <button
        onClick={onClick}
        className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-primary text-primary-foreground border-2 border-primary"
      >
        Sign up free
      </button>
    </div>
  );
}

interface PostClientPageProps {
  postId: string;
}

type PostPageData = Omit<MusicLinkConversion, 'conversionSuccessCount'> & {
  previewUrl?: string;
  description?: string;
  isRepost?: boolean;
  originalPostId?: string | null;
  redirectPostId?: string;
  repostedByCurrentUser?: boolean;
  username?: string;
  userId?: string | null;
  createdAt?: string;
  genres?: string[];
  albumName?: string;
  releaseDate?: string | null;
  trackCount?: number;
  details?: { artists?: Array<{ name: string; role: string; }>; };
  musicElementId?: string;
  sourcePlatform?: string;
  privacy?: string;
  conversionSuccessCount?: number | null;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  commentsEnabled?: boolean;
};

type PostLikeResponse = {
  success: boolean;
  postId: string;
  liked: boolean;
  likeCount: number;
};

type NormalizedPlatformKey = 'spotify' | 'appleMusic' | 'deezer';

const normalizePlatformKey = (platform?: string | null): NormalizedPlatformKey | null => {
  if (!platform) return null;
  const normalized = platform.toLowerCase().replace(/[\s_-]/g, '');

  if (normalized === 'spotify') return 'spotify';
  if (normalized === 'deezer') return 'deezer';
  if (normalized === 'applemusic' || normalized === 'apple') return 'appleMusic';

  return null;
};

const normalizeElementType = (elementType?: string | null): 'track' | 'album' | 'artist' | 'playlist' => {
  const normalized = elementType?.toLowerCase();
  if (normalized === 'track' || normalized === 'album' || normalized === 'artist' || normalized === 'playlist') {
    return normalized;
  }
  return 'track';
};

const resolvePlatformUrl = (
  platform: NormalizedPlatformKey,
  platformData: { url?: string; uri?: string; platformSpecificId?: string; elementType?: string } | undefined,
  fallbackElementType: string | undefined,
): string => {
  const directUrl = platformData?.url?.trim();
  if (directUrl) {
    return directUrl;
  }

  const uriAsUrl = platformData?.uri?.trim();
  if (uriAsUrl && /^https?:\/\//i.test(uriAsUrl)) {
    return uriAsUrl;
  }

  const platformSpecificId = platformData?.platformSpecificId?.trim();
  if (!platformSpecificId) {
    return '';
  }

  const elementType = normalizeElementType(platformData?.elementType || fallbackElementType);

  if (platform === 'spotify') {
    return `https://open.spotify.com/${elementType}/${platformSpecificId}`;
  }

  if (platform === 'deezer') {
    return `https://www.deezer.com/${elementType}/${platformSpecificId}`;
  }

  const applePathType = elementType === 'track' ? 'song' : elementType;
  return `https://music.apple.com/us/${applePathType}/${platformSpecificId}`;
};

const buildArtistSearchUrl = (platform: NormalizedPlatformKey, artistName: string): string => {
  const query = encodeURIComponent(artistName.trim());
  if (!query) return '';

  if (platform === 'spotify') {
    return `https://open.spotify.com/search/${query}`;
  }

  if (platform === 'deezer') {
    return `https://www.deezer.com/search/${query}`;
  }

  return `https://music.apple.com/us/search?term=${query}`;
};

const REPOSTED_POSTS_STORAGE_KEY = 'cassette_reposted_posts_v1';

const readRepostedPosts = (userId?: string | null): Record<string, true> => {
  if (!userId || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(REPOSTED_POSTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Record<string, true>>;
    return parsed[userId] || {};
  } catch {
    return {};
  }
};

const markPostAsReposted = (userId: string | undefined, targetPostId: string | undefined) => {
  if (!userId || !targetPostId || typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(REPOSTED_POSTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, Record<string, true>> : {};
    const currentUserPosts = parsed[userId] || {};
    currentUserPosts[targetPostId] = true;
    parsed[userId] = currentUserPosts;
    window.localStorage.setItem(REPOSTED_POSTS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // best effort
  }
};

const unmarkPostAsReposted = (userId: string | undefined, targetPostId: string | undefined) => {
  if (!userId || !targetPostId || typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(REPOSTED_POSTS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Record<string, true>>;
    const currentUserPosts = parsed[userId] || {};
    if (currentUserPosts[targetPostId]) {
      delete currentUserPosts[targetPostId];
    }
    parsed[userId] = currentUserPosts;
    window.localStorage.setItem(REPOSTED_POSTS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // best effort
  }
};

export default function PostClientPage({ postId }: PostClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuthState();
  const { mutate: addToProfile, isPending: isAddingToProfile } = useAddMusicToProfile();
  const [addStatus, setAddStatus] = useState<'idle' | 'added' | 'error'>('idle');
  const [postData, setPostData] = useState<PostPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation states
  const [palette, setPalette] = useState<ColorPalette | null>(null);
  const handleSignupClick = () => router.push('/auth/signup');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [imageError, setImageError] = useState(false);

  // Edit/Delete modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRepostPending, setIsRepostPending] = useState(false);
  const [hasReposted, setHasReposted] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [likeAuthPromptOpen, setLikeAuthPromptOpen] = useState(false);
  const { openReportModal } = useReportIssue();
  const fromParam = searchParams.get('from');
  const backRoute =
    fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//')
      ? fromParam
      : undefined;

  // Handle delete success - redirect to profile
  const handleDeleteSuccess = useCallback(() => {
    if (postData?.username) {
      router.push(`/profile/${postData.username}`);
    } else {
      router.push('/');
    }
  }, [router, postData?.username]);

  // Handle edit success - update local state with new description
  const handleEditSuccess = useCallback((updated: { description: string; privacy: string; commentsEnabled: boolean }) => {
    setPostData((prev) =>
      prev ? { ...prev, description: updated.description, privacy: updated.privacy, commentsEnabled: updated.commentsEnabled } : prev
    );
  }, []);

  // Ref to track the source URL for add-to-profile
  const sourceUrlRef = useRef<string | null>(null);
  const sourcePlatformRef = useRef<string | null>(null);

  useEffect(() => {
    setAddStatus('idle');
    setImageError(false);
  }, [postData?.postId, postData?.originalUrl]);

  const buildShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    // Use the new path format
    const id = postData?.postId || postId;
    if (id) return `${window.location.origin}/post/${id}`;
    return window.location.href;
  }, [postData?.postId, postId]);

  const handleShare = useCallback(async () => {
    void captureClientEvent('post_shared', {
      route: `/post/${postData?.postId || postId}`,
      source_surface: 'post',
      post_id: postData?.postId || postId,
      element_type: postData?.metadata?.type as 'track' | 'album' | 'artist' | 'playlist' | undefined,
      source_platform: sourcePlatformRef.current as 'spotify' | 'apple' | 'deezer' | 'unknown' | undefined,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
    });

    const shareUrl = buildShareUrl();
    if (!shareUrl) return;

    const shareTitle = postData?.metadata?.title || 'Music';
    const shareArtist = postData?.metadata?.artist;
    const shareText = shareArtist
      ? `Check out "${shareTitle}" by ${shareArtist} on Cassette`
      : `Check out "${shareTitle}" on Cassette`;

    // Only use Web Share API on mobile/touch devices where it's actually useful
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window && window.innerWidth < 1024);

    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Desktop: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopyState('copied');
      } catch (err) {
        console.error('Failed to copy link:', err);
        setCopyState('error');
        setTimeout(() => setCopyState('idle'), 2000);
      }
    }
  }, [buildShareUrl, postData?.metadata?.title, postData?.metadata?.artist, postData?.postId, postData?.metadata?.type, postId, user?.id, isAuthenticated]);

  const handleAddToProfile = useCallback(() => {
    const musicElementId = postData?.musicElementId;
    const elementType = postData?.metadata?.type;

    console.log('🔍 Add to profile:', { musicElementId, elementType });

    if (!musicElementId || elementType === undefined) {
      console.log('❌ Missing musicElementId or elementType');
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 3000);
      return;
    }

    addToProfile(
      {
        musicElementId,
        elementType,
        description: postData?.description,
        artworkUrl: postData?.metadata?.artwork,
      },
      {
        onSuccess: () => setAddStatus('added'),
        onError: (error) => {
          console.error('❌ Add to profile failed:', error);
          setAddStatus('error');
          setTimeout(() => setAddStatus('idle'), 3000);
        },
      },
    );
  }, [addToProfile, postData?.musicElementId, postData?.metadata?.type, postData?.description, postData?.metadata?.artwork]);

  const handleRepost = useCallback(async () => {
    const currentPostId = postData?.postId || postId;
    if (!currentPostId || isRepostPending || !isAuthenticated) return;

    try {
      setIsRepostPending(true);
      if (hasReposted) {
        await apiService.unrepostPost(currentPostId);
        setHasReposted(false);
        unmarkPostAsReposted(user?.id, currentPostId);
        toast.success('Removed repost from your profile.');
      } else {
        await apiService.repostPost(currentPostId);
        setHasReposted(true);
        markPostAsReposted(user?.id, currentPostId);
        toast.success('Reposted to your profile.');
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-activity'] }),
        queryClient.invalidateQueries({ queryKey: ['explore-activity'] }),
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.message || '';
        if (message.toLowerCase().includes('already repost')) {
          setHasReposted(true);
          markPostAsReposted(user?.id, currentPostId);
        }
        toast.error(error.message || (hasReposted ? 'Unable to remove repost.' : 'Unable to repost this post.'));
      } else if (error instanceof Error) {
        toast.error(error.message || (hasReposted ? 'Unable to remove repost.' : 'Unable to repost this post.'));
      } else {
        toast.error(hasReposted ? 'Unable to remove repost.' : 'Unable to repost this post.');
      }
    } finally {
      setIsRepostPending(false);
    }
  }, [hasReposted, isAuthenticated, isRepostPending, postData?.postId, postId, queryClient, user?.id]);

  const isOwnPostById =
    !!postData?.userId &&
    !!user?.id &&
    postData.userId.toLowerCase() === user.id.toLowerCase();
  const isOwnPostByUsername =
    !postData?.userId &&
    !!postData?.username &&
    !!user?.username &&
    postData.username.toLowerCase() === user.username.toLowerCase();
  const isOwnPost = isOwnPostById || isOwnPostByUsername;
  const hasOwner = Boolean(postData?.userId || postData?.username?.trim());
  const showAddToProfile = isAuthenticated && !hasOwner;
  const isPublicPost = (postData?.privacy || 'public').toLowerCase() !== 'private';
  const canRepost = Boolean(isAuthenticated && hasOwner && !isOwnPost && isPublicPost);

  const handleToggleLike = useCallback(async () => {
    const currentPostId = postData?.postId || postId;
    if (!currentPostId || isLikePending) return;

    if (!isAuthenticated) {
      setLikeAuthPromptOpen(true);
      return;
    }

    const previousLiked = Boolean(postData?.likedByCurrentUser);
    const previousLikeCount = Math.max(0, postData?.likeCount ?? 0);
    const optimisticLiked = !previousLiked;
    const optimisticLikeCount = Math.max(0, previousLikeCount + (optimisticLiked ? 1 : -1));

    setIsLikePending(true);
    setPostData((prev) =>
      prev
        ? {
            ...prev,
            likedByCurrentUser: optimisticLiked,
            likeCount: optimisticLikeCount,
          }
        : prev
    );

    try {
      const response = (previousLiked
        ? await apiService.unlikePost(currentPostId)
        : await apiService.likePost(currentPostId)) as PostLikeResponse;

      setPostData((prev) =>
        prev
          ? {
              ...prev,
              likedByCurrentUser: response.liked,
              likeCount: Math.max(0, response.likeCount),
            }
          : prev
      );

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-liked-activity'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['user-activity'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['explore-activity'], refetchType: 'all' }),
      ]);
    } catch (error) {
      setPostData((prev) =>
        prev && (prev.postId || postId) === currentPostId
          ? {
              ...prev,
              likedByCurrentUser: previousLiked,
              likeCount: previousLikeCount,
            }
          : prev
      );

      if (error instanceof ApiError && error.status === 401) {
        setLikeAuthPromptOpen(true);
      } else {
        toast.error('Failed to update like. Please try again.');
      }
    } finally {
      setIsLikePending(false);
    }
  }, [
    isAuthenticated,
    isLikePending,
    postData?.likeCount,
    postData?.likedByCurrentUser,
    postData?.postId,
    postId,
    queryClient,
  ]);

  // Fetch post data
  useEffect(() => {
    let isCancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const shouldRetryFetchPost = (error: unknown) => {
      if (error instanceof ApiError) {
        const status = error.status || 0;
        return [404, 408, 409, 425, 429, 500, 502, 503, 504].includes(status);
      }
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('timed out') || message.includes('network') || message.includes('fetch');
      }
      return false;
    };

    const fetchPost = async () => {
      try {
        // Reset stale error state before each fetch cycle.
        setError(null);

        const retryDelaysMs = [250, 500, 1000, 1500, 2500, 3500, 5000];
        let response: Awaited<ReturnType<typeof apiService.fetchPostById>> | null = null;

        for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
          if (isCancelled) return;
          try {
            const candidate = await apiService.fetchPostById(postId);
            if (candidate?.success) {
              response = candidate;
              break;
            }

            // Some backends return 200 + success=false while a new post is still materializing.
            if (attempt === retryDelaysMs.length) {
              throw new Error('Post not ready yet');
            }
            await sleep(retryDelaysMs[attempt]);
          } catch (fetchError) {
            if (!shouldRetryFetchPost(fetchError) || attempt === retryDelaysMs.length) {
              throw fetchError;
            }
            const retryAfterMs = fetchError instanceof ApiError && typeof fetchError.retryAfterMs === 'number'
              ? fetchError.retryAfterMs
              : retryDelaysMs[attempt];
            await sleep(Math.max(100, retryAfterMs));
          }
        }

        if (!response) {
          throw new Error('Failed to load content');
        }

        if (response.success) {
          setError(null);
          const elementTypeLower = response.elementType?.toLowerCase();
          const isTrackResp = elementTypeLower === 'track';
          const isAlbumResp = elementTypeLower === 'album';
          const isArtistResp = elementTypeLower === 'artist';
          const typeVal = isTrackResp ? ElementType.TRACK : isAlbumResp ? ElementType.ALBUM : isArtistResp ? ElementType.ARTIST : ElementType.PLAYLIST;

          const titleVal = response.details?.title || response.details?.name || (response as unknown as { name?: string }).name || 'Unknown';
          const artistVal = response.details?.artist || '';
          const artworkVal = response.details?.coverArtUrl || response.details?.imageUrl || (response as unknown as { imageUrl?: string }).imageUrl || '';
          const durationVal = response.metadata?.duration || response.details?.duration || '';

          const originalLink =
            response.originalLink ||
            (response as unknown as { sourceUrl?: string }).sourceUrl ||
            response.platforms?.spotify?.url ||
            response.platforms?.applemusic?.url ||
            response.platforms?.appleMusic?.url ||
            response.platforms?.deezer?.url ||
            '';
          const transformedData: PostPageData = {
            originalUrl: originalLink,
            convertedUrls: {},
            metadata: {
              type: typeVal,
              title: titleVal,
              artist: artistVal,
              artwork: artworkVal,
              duration: durationVal,
            },
            description: response.description || response.caption,
            isRepost: Boolean(response.isRepost),
            originalPostId: response.originalPostId ?? null,
            redirectPostId: response.redirectPostId || response.postId || postId,
            repostedByCurrentUser: Boolean(
              (response as unknown as Record<string, unknown>).repostedByCurrentUser === true ||
              (response as unknown as Record<string, unknown>).RepostedByCurrentUser === true ||
              (response as unknown as Record<string, unknown>).isRepostedByCurrentUser === true ||
              (response as unknown as Record<string, unknown>).IsRepostedByCurrentUser === true
            ),
            username: response.username,
            userId: response.userId ?? null,
            createdAt: response.createdAt,
            privacy: response.privacy,
            conversionSuccessCount: response.conversionSuccessCount,
            likeCount: typeof response.likeCount === 'number' ? response.likeCount : 0,
            likedByCurrentUser: Boolean(response.likedByCurrentUser),
            commentsEnabled: response.commentsEnabled ?? true,
            genres: response.details?.genres || response.metadata?.genres || [],
            albumName: response.metadata?.albumName || response.details?.album || '',
            releaseDate: response.metadata?.releaseDate || response.details?.releaseDate || null,
            trackCount: (typeof (response.details as { trackCount?: number } | undefined)?.trackCount === 'number')
              ? (response.details as { trackCount?: number }).trackCount
              : (response as unknown as { numberOfTracks?: number }).numberOfTracks,
            details: {
              artists: response.details?.artists || []
            },
            musicElementId: response.musicElementId || ''
          };

          // Map album/playlist track data when available
          type ApiAlbumTrack = {
            title?: string;
            duration?: string;
            trackNumber?: number;
            artists?: string[];
            previewUrl?: string;
            isrc?: string;
            spotifyTrackId?: string;
            appleMusicTrackId?: string;
          };

          const trackArray = (response.details as { tracks?: ApiAlbumTrack[] } | undefined)?.tracks;
          if (Array.isArray(trackArray) && trackArray.length > 0) {
            const mapped: MediaListTrack[] = trackArray.map((t) => ({
              trackNumber: t.trackNumber,
              title: t.title ?? 'Untitled',
              duration: t.duration,
              artists: Array.isArray(t.artists) ? t.artists : undefined,
              previewUrl: t.previewUrl,
              isrc: t.isrc,
              spotifyTrackId: t.spotifyTrackId,
              appleMusicTrackId: t.appleMusicTrackId,
            }));
            transformedData.tracks = mapped;
          }

          // Fallback: some responses provide tracks at the top level
          type ApiTopLevelTrack = {
            title?: string;
            duration?: string;
            artist?: string;
            artists?: string[];
            previewUrl?: string | null;
            trackNumber?: number;
            isrc?: string;
            spotifyTrackId?: string;
            appleMusicTrackId?: string;
          };
          const topLevelTracks = (response as unknown as { tracks?: ApiTopLevelTrack[] }).tracks;
          if ((!transformedData.tracks || transformedData.tracks.length === 0) && Array.isArray(topLevelTracks) && topLevelTracks.length > 0) {
            const mappedTop: MediaListTrack[] = topLevelTracks.map((t, idx) => ({
              trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : idx + 1,
              title: t.title ?? 'Untitled',
              duration: t.duration,
              artists: t.artist ? [t.artist] : Array.isArray(t.artists) ? t.artists : undefined,
              previewUrl: t.previewUrl ?? undefined,
              isrc: t.isrc,
              spotifyTrackId: t.spotifyTrackId,
              appleMusicTrackId: t.appleMusicTrackId,
            }));
            transformedData.tracks = mappedTop;
          }

          // Extract platform URLs and artwork (with URL reconstruction fallback for older/incomplete records)
          let fallbackArtwork = '';
          let fallbackPreview = '';
          if (response.platforms) {
            Object.entries(response.platforms).forEach(([platform, data]) => {
              const platformKey = normalizePlatformKey(platform);
              if (platformKey) {
                const resolvedUrl = resolvePlatformUrl(
                  platformKey,
                  data as { url?: string; uri?: string; platformSpecificId?: string; elementType?: string } | undefined,
                  elementTypeLower
                );

                if (resolvedUrl) {
                  transformedData.convertedUrls[platformKey] = resolvedUrl;
                }
              }

              if (data?.artworkUrl && !fallbackArtwork) {
                fallbackArtwork = data.artworkUrl;
              }

              if (data?.previewUrl && data.previewUrl.trim() !== '' && !fallbackPreview) {
                fallbackPreview = data.previewUrl;
              }
            });

            // Extract preview URL
            transformedData.previewUrl = response.details?.previewUrl || fallbackPreview;
          }

          // Use fallback artwork if main artwork is empty
          if (!transformedData.metadata.artwork && fallbackArtwork) {
            transformedData.metadata.artwork = fallbackArtwork;
          }

          // Artist posts can have partial platform data persisted in DB.
          // Keep destination buttons visible by falling back to platform search links.
          if (typeVal === ElementType.ARTIST) {
            const artistSearchName = (transformedData.metadata.title || transformedData.metadata.artist || '').trim();
            if (artistSearchName) {
              if (!transformedData.convertedUrls.spotify) {
                transformedData.convertedUrls.spotify = buildArtistSearchUrl('spotify', artistSearchName);
              }
              if (!transformedData.convertedUrls.appleMusic) {
                transformedData.convertedUrls.appleMusic = buildArtistSearchUrl('appleMusic', artistSearchName);
              }
              if (!transformedData.convertedUrls.deezer) {
                transformedData.convertedUrls.deezer = buildArtistSearchUrl('deezer', artistSearchName);
              }
            }
          }

          const detectedSourcePlatform = detectContentType(originalLink || '').platform;
          sourceUrlRef.current = originalLink || sourceUrlRef.current;
          sourcePlatformRef.current = detectedSourcePlatform || sourcePlatformRef.current;
          void captureClientEvent('post_viewed', {
            route: `/post/${response.postId || postId}`,
            source_surface: 'post',
            post_id: response.postId || postId,
            element_type: elementTypeLower as 'track' | 'album' | 'artist' | 'playlist' | undefined,
            source_platform: detectedSourcePlatform,
            user_id: user?.id,
            is_authenticated: isAuthenticated,
          });
          setPostData({
            ...transformedData,
            sourcePlatform: detectedSourcePlatform,
            postId: response.postId || postId || transformedData.postId,
          });
          const repostedByApi = Boolean(transformedData.repostedByCurrentUser);
          const repostedFromLocal = Boolean(readRepostedPosts(user?.id)[response.postId || postId]);
          setHasReposted(repostedByApi || repostedFromLocal);

          // Extract dominant color
          if (transformedData.metadata.artwork) {
            extractColorFromArtwork(transformedData.metadata.artwork);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (e) {
        if (isCancelled) return;
        console.error('Error loading post data:', e);
        setError('Failed to load content');
      }
    };

    void fetchPost();
    return () => {
      isCancelled = true;
    };
  }, [postId, user?.id, isAuthenticated]);

  // Color extraction function
  const extractColorFromArtwork = async (artworkUrl: string) => {
    try {
      const result = await ColorExtractor.extractPalette(artworkUrl);
      setPalette(result);
    } catch (error) {
      console.error('Color extraction failed:', error);
      setPalette(ColorExtractor.getBrandPalette());
    }
  };

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 900);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Show skeleton while loading
  if (!postData && !error) {
    return <EntitySkeleton isDesktop={isDesktop} />;
  }

  if (error && !postData) {
    return (
      <div className="min-h-screen relative">
        <AnimatedColorBackground
          color={palette?.dominant ?? null}
          gradientColors={palette ? [palette.dominant, palette.muted] : undefined}
        />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <MainContainer className="text-center p-8">
            <div className="mb-4">
              <svg className="w-16 h-16 text-danger mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <HeadlineText className="mb-2">Unable to load content</HeadlineText>
            <BodyText className="text-text-secondary mb-6">
              This content may have been removed or the link is invalid
            </BodyText>
            <BackButton variant="button" buttonVariant="default" route={backRoute} fallbackRoute="/explore" className="h-10" />
          </MainContainer>
        </div>
      </div>
    );
  }

  const { metadata, convertedUrls } = postData as MusicLinkConversion;

  // Derive clear flags for how to render the page based on content type
  const detectedTypeFromUrl = detectContentType(postData?.originalUrl || sourceUrlRef.current || '').type;
  const isTrack = metadata.type === ElementType.TRACK;
  const isAlbum = metadata.type === ElementType.ALBUM;
  const isArtist = metadata.type === ElementType.ARTIST;
  const isPlaylist = metadata.type === ElementType.PLAYLIST || detectedTypeFromUrl === 'playlist';
  const typeLabel = isTrack ? 'Track' : isAlbum ? 'Album' : isArtist ? 'Artist' : 'Playlist';
  const showTracks = (isAlbum || isPlaylist) && Array.isArray(postData?.tracks) && (postData.tracks?.length ?? 0) > 0;
  const hasPostOwner = Boolean(postData?.username || postData?.userId);
  const ownerVisibleConversionCount =
    isPlaylist && isOwnPost && typeof postData?.conversionSuccessCount === 'number'
      ? postData.conversionSuccessCount
      : undefined;
  const playlistTrackCount = Array.isArray(postData?.tracks) && postData.tracks.length > 0
    ? postData.tracks.length
    : typeof postData?.trackCount === 'number'
      ? postData.trackCount
      : undefined;
  const useSplitScrollLayout = isDesktop && (isAlbum || isPlaylist);
  const showSignupCTA = !isLoading && !isAuthenticated;

  const providedSourceUrl = (postData?.originalUrl || sourceUrlRef.current)?.trim();
  const detectedFromProvided = providedSourceUrl ? detectContentType(providedSourceUrl).platform : null;
  const normalizedFromProp = normalizePlatformKey(postData?.sourcePlatform || sourcePlatformRef.current);
  const fallbackSourceUrl =
    (normalizedFromProp ? convertedUrls[normalizedFromProp] : undefined) ||
    convertedUrls.spotify ||
    convertedUrls.appleMusic ||
    convertedUrls.deezer;
  const resolvedSourceUrl = providedSourceUrl || fallbackSourceUrl || null;
  const detectedFromResolved = resolvedSourceUrl ? detectContentType(resolvedSourceUrl).platform : null;
  const sourcePlatformKey =
    normalizedFromProp ||
    normalizePlatformKey(detectedFromProvided) ||
    normalizePlatformKey(detectedFromResolved) ||
    null;
  const analyticsSourcePlatform = sourcePlatformKey || postData?.sourcePlatform || sourcePlatformRef.current || undefined;
  const sourceService = sourcePlatformKey ? streamingServices[sourcePlatformKey] : null;

  return (
    <div className={useSplitScrollLayout ? "fixed inset-x-0 top-16 bottom-0 overflow-y-auto" : "min-h-screen relative"}>
      {/* Animated Gradient Background */}
      <AnimatedColorBackground
        color={palette?.dominant ?? null}
        gradientColors={palette ? [palette.dominant, palette.muted] : undefined}
      />

      <div className={useSplitScrollLayout ? "relative z-10 h-full" : "relative z-10 min-h-screen"}>
        {isDesktop ? (
          useSplitScrollLayout ? (
          // Desktop Album/Playlist: fixed left, scrollable right (only right side scrolls)
          <div className="px-8 max-w-7xl mx-auto h-full flex flex-col min-h-0">
            {/* Header Toolbar */}
            <div className="pt-4 pb-4 px-3 shrink-0 max-w-7xl mx-auto w-full">
              <div className="flex items-center justify-between gap-3">
                <BackButton route={backRoute} fallbackRoute="/explore" />
                <motion.button
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border font-medium text-sm overflow-hidden ${
                    copyState === 'copied'
                      ? 'bg-success/20 text-success-text border-success/30'
                      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                  }`}
                  onClick={handleShare}
                  aria-label="Share"
                  whileTap={{ scale: 0.95 }}
                  animate={copyState === 'copied' ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {copyState === 'copied' ? (
                      <motion.span
                        key="copied"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                {/* More Menu */}
                {isOwnPost && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwnPost && (
                        <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {isOwnPost && (
                        <DropdownMenuItem
                          onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {/* Content Row */}
            <div className="flex gap-8 flex-1 min-h-0">
              {/* Left: fixed panel */}
              <div className="flex-[2] sticky top-0 h-full overflow-y-auto no-scrollbar">
                {/* Make the left column fill the available height and center content vertically */}
                <div className="min-h-full flex flex-col items-center justify-start min-w-0 pt-2 pb-[calc(6rem+env(safe-area-inset-bottom))]">
                  <UIText className="text-foreground font-bold mb-8 uppercase tracking-wider text-lg">
                    {typeLabel}
                  </UIText>
                  {/* Artwork */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                    <Image
                      src={imageError || !metadata.artwork ? '/images/cassette_logo.png' : metadata.artwork}
                      alt={metadata.title}
                      width={340}
                      height={340}
                      className="relative rounded-xl object-cover shadow-xl"
                      priority
                      onError={() => setImageError(true)}
                      unoptimized={!imageError && !!metadata.artwork}
                    />
                    {isTrack && postData?.previewUrl && (
                      <div className="absolute -bottom-4 -right-4">
                        <PlayPreview
                          previewUrl={postData.previewUrl}
                          title={metadata.title}
                          artist={metadata.artist}
                          artwork={metadata.artwork}
                        />
                      </div>
                    )}
                  </div>
                  {/* Info Card (moved from right) */}
                  {(isAlbum || isPlaylist) && (
                    <div className="p-8 rounded-2xl border border-border bg-card shadow-lg w-full max-w-xl">
                      <div className="space-y-6">
                        <HeadlineText className="text-3xl font-bold text-foreground text-center leading-tight">
                          {metadata.title}
                        </HeadlineText>
                        {/* Artist line for album */}
                        {isAlbum && (
                          <div className="text-center">
                            <BodyText className="text-lg text-muted-foreground">
                              {postData?.details?.artists && postData.details.artists.length > 0 ? (
                                postData.details.artists.map((artist, idx) => (
                                  <span key={idx}>
                                    {artist.name}
                                    {artist.role === 'Featured' && <span className="text-sm"> (feat.)</span>}
                                    {idx < postData.details!.artists!.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                metadata.artist
                              )}
                            </BodyText>
                          </div>
                        )}
                        <div className="border-t border-border/30 mx-6" />
                        {isPlaylist ? (
                          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-base">
                            {/* Show track count - prefer actual tracks array length, fall back to trackCount metadata */}
                            {(Array.isArray(postData?.tracks) && postData.tracks.length > 0) ? (
                              <div>
                                <span className="text-muted-foreground">Tracks: </span>
                                <span className="font-medium">{postData.tracks.length}</span>
                              </div>
                            ) : typeof postData?.trackCount === 'number' && postData.trackCount > 0 ? (
                              <div>
                                <span className="text-muted-foreground">Tracks: </span>
                                <span className="font-medium">{postData.trackCount}</span>
                              </div>
                            ) : null}
                            {/* Source attribution badge */}
                            {sourcePlatformKey && resolvedSourceUrl && sourceService && (
                              <a
                                href={resolvedSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  void captureClientEvent('streaming_link_opened', {
                                    route: `/post/${postData?.postId || postId}`,
                                    source_surface: 'post',
                                    source_platform: sourcePlatformKey === 'appleMusic'
                                      ? 'apple'
                                      : sourcePlatformKey ?? 'unknown',
                                    source_domain: resolvedSourceUrl,
                                    post_id: postData?.postId || postId,
                                    element_type: 'playlist',
                                    is_authenticated: isAuthenticated,
                                  });
                                }}
                                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full mt-2"
                              >
                                <Image
                                  src={sourceService.icon}
                                  alt={sourceService.name}
                                  width={16}
                                  height={16}
                                  className="opacity-70 group-hover:opacity-100 transition-opacity"
                                />
                                <span>from {sourceService.name}</span>
                                <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                          </div>
                        ) : (
                          // Album meta row
                          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-base">
                            {postData?.releaseDate && (
                              <div>
                                <span className="text-muted-foreground">Released: </span>
                                <span className="font-medium">{postData.releaseDate}</span>
                              </div>
                            )}
                            {postData?.releaseDate && postData?.trackCount && (
                              <span className="text-muted-foreground">•</span>
                            )}
                            {typeof postData?.trackCount === 'number' && (
                              <div>
                                <span className="text-muted-foreground">Tracks: </span>
                                <span className="font-medium">{postData.trackCount}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {(() => {
                          const filteredGenres = postData?.genres?.filter(genre =>
                            genre.toLowerCase() !== 'music'
                          ) || [];
                          if (filteredGenres.length === 0) return null;
                          return (
                            <>
                              <div className="border-t border-border/30 mx-6" />
                              <div className="flex flex-wrap gap-3 justify-center">
                                {filteredGenres.map((genre, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-muted/30 text-muted-foreground border border-border/50"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  {/* PostDescriptionCard for album/playlist */}
                  {postData?.username && (
                    <PostDescriptionCard
                      username={postData.username}
                      description={postData?.description || ''}
                      createdAt={postData?.createdAt}
                      conversionSuccessCount={ownerVisibleConversionCount}
                      likeCount={postData?.likeCount ?? 0}
                      likedByCurrentUser={Boolean(postData?.likedByCurrentUser)}
                      isLikePending={isLikePending}
                      onToggleLike={handleToggleLike}
                      canRepost={canRepost}
                      hasReposted={hasReposted}
                      isRepostPending={isRepostPending}
                      onRepost={() => void handleRepost()}
                      className="mt-6 w-full max-w-xl relative z-20"
                    />
                  )}
                  {hasPostOwner && (
                    <PostCommentsCard
                      postId={postData?.postId || postId}
                      isVisible={true}
                      commentsEnabled={postData?.commentsEnabled ?? true}
                      currentUserId={user?.id}
                      currentUsername={user?.username}
                      className="mt-6 max-w-xl"
                    />
                  )}
                  {/* Streaming Links (moved from right) */}
                  {(isAlbum || isPlaylist) && (
                    <div className="mt-6 p-8 rounded-2xl border border-border bg-card shadow-lg relative z-10 w-full max-w-xl">
                      <h3 className="text-xl font-semibold text-card-foreground mb-6 text-center">Listen Now</h3>
                        {isPlaylist ? (
                          <PlaylistStreamingLinks
                            links={convertedUrls}
                            className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                            playlistId={postData?.musicElementId || ''}
                            postId={postData?.postId || postId}
                            playlistTrackCount={playlistTrackCount}
                            sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                            sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                          />
                        ) : (
                          <StreamingLinks
                            links={convertedUrls}
                            postId={postData?.postId || postId}
                            elementType={metadata.type}
                            sourcePlatform={analyticsSourcePlatform}
                            isAuthenticated={isAuthenticated}
                            className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                        />
                      )}
                    </div>
                  )}
                  {showAddToProfile && (
                    <div className="mt-5 w-full max-w-xl flex justify-center">
                      <Button
                        onClick={handleAddToProfile}
                        disabled={isAddingToProfile || addStatus === 'added'}
                        className="h-12 px-8 font-bold tracking-wide font-atkinson"
                      >
                        {addStatus === 'added' ? 'Added to Profile' : addStatus === 'error' ? 'Failed to Add' : 'Add Post to Profile'}
                      </Button>
                    </div>
                  )}
                  {showSignupCTA && (
                    <JoinCassetteCTA
                      onClick={handleSignupClick}
                      className="mt-6 w-full max-w-xl"
                    />
                  )}
                  {/* Report Problem (moved to left to keep right-only track list) */}
                  {(isAlbum || isPlaylist) && (
                    <div className="mt-6 mb-[calc(6rem+env(safe-area-inset-bottom))] flex justify-center w-full max-w-xl">
                      <button
                        onClick={() => openReportModal({
                          sourceContext: 'post_view',
                          sourceLink: postData?.originalUrl || sourceUrlRef.current || '',
                          conversionData: {
                            elementType: metadata.type,
                            title: metadata.title,
                            artist: metadata.artist,
                            platforms: postData?.convertedUrls,
                          },
                        })}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Report a Problem</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Right: scrollable pane */}
              <div className="flex-[3] overflow-y-auto no-scrollbar pr-1 min-h-0">
                <div className="pt-8 pb-12 max-w-2xl">
                  <div className="space-y-8">
                    {/* Track list for album/playlist */}
                    {showTracks && (
                      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
                        <div className="p-5 border-b border-border bg-muted/50">
                          <h3 className="text-lg font-semibold text-foreground">
                            {isPlaylist ? 'Playlist Tracks' : 'Album Tracks'}
                          </h3>
                        </div>
                        <TrackList
                          items={postData.tracks!}
                          artwork={metadata.artwork}
                          albumArtist={metadata.artist}
                          variant={isAlbum ? 'album' : 'playlist'}
                          scrollable={false}
                          className="!border-0 !bg-transparent !shadow-none"
                          sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          ) : (
            // Desktop Track/Artist: keep original full-page scroll behavior
            <div className="mt-16">
              {/* Header Toolbar */}
              <div className="pt-4 pb-6 px-3 relative z-20 max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between gap-3">
                  <BackButton route={backRoute} fallbackRoute="/explore" />
                  <motion.button
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border font-medium text-sm overflow-hidden ${
                      copyState === 'copied'
                        ? 'bg-success/20 text-success-text border-success/30'
                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    }`}
                    onClick={handleShare}
                    aria-label="Share"
                    whileTap={{ scale: 0.95 }}
                    animate={copyState === 'copied' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence mode="wait">
                      {copyState === 'copied' ? (
                        <motion.span
                          key="copied"
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          className="flex items-center gap-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copy Link</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                  {/* More Menu */}
                  {isOwnPost && (
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isOwnPost && (
                          <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {isOwnPost && (
                          <DropdownMenuItem
                            onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <div className="px-8 max-w-7xl mx-auto pb-8">
                <div className="flex gap-12">
                  {/* Left Column - Artwork */}
                  <div className="flex-[2] sticky top-[120px] self-start">
                    <div className="flex flex-col items-center min-w-0 h-[calc(100vh-140px)] justify-center">
                      <UIText className="text-foreground font-bold mb-6 uppercase tracking-wider text-lg">
                        {typeLabel}
                      </UIText>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                        <Image
                          src={imageError || !metadata.artwork ? '/images/cassette_logo.png' : metadata.artwork}
                          alt={metadata.title}
                          width={360}
                          height={360}
                          className="relative rounded-xl object-cover shadow-lg"
                          priority
                          onError={() => setImageError(true)}
                          unoptimized={!imageError && !!metadata.artwork}
                        />
                        {isTrack && postData?.previewUrl && (
                          <div className="absolute -bottom-4 -right-4">
                            <PlayPreview
                              previewUrl={postData.previewUrl}
                              title={metadata.title}
                              artist={metadata.artist}
                              artwork={metadata.artwork}
                            />
                          </div>
                        )}
                      </div>
                      {hasPostOwner && (
                        <PostCommentsCard
                          postId={postData?.postId || postId}
                          isVisible={true}
                          commentsEnabled={postData?.commentsEnabled ?? true}
                          currentUserId={user?.id}
                          currentUsername={user?.username}
                          className="w-full max-w-md"
                        />
                      )}
                    </div>
                  </div>
                  {/* Right Column - Content (page scroll) */}
                  <div className="flex-[3]">
                    {/* Vertically center content relative to viewport height */}
                    <div className="py-8 pb-16 min-h-[calc(100vh-140px)] flex flex-col justify-center">
                      <div className="space-y-6">
                        {/* Info Card */}
                        <div className="p-6 rounded-2xl border border-border bg-card shadow-lg">
                          <div className="space-y-3">
                            <HeadlineText className="text-xl font-bold text-foreground text-center">
                              {metadata.title}
                            </HeadlineText>
                            {(isTrack || isAlbum) && (
                              <div className="text-center">
                                <BodyText className="text-base text-muted-foreground">
                                  {postData?.details?.artists && postData.details.artists.length > 0 ? (
                                    postData.details.artists.map((artist, idx) => (
                                      <span key={idx}>
                                        {artist.name}
                                        {artist.role === 'Featured' && <span className="text-xs"> (feat.)</span>}
                                        {idx < postData.details!.artists!.length - 1 && ', '}
                                      </span>
                                    ))
                                  ) : (
                                    metadata.artist
                                  )}
                                </BodyText>
                              </div>
                            )}
                            <div className="border-t border-border/30 mx-4" />
                            {isTrack ? (
                              <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
                                {metadata.duration && (
                                  <div>
                                    <span className="text-muted-foreground">Duration: </span>
                                    <span className="font-medium">{metadata.duration}</span>
                                  </div>
                                )}
                                {metadata.duration && postData?.albumName && (
                                  <span className="text-muted-foreground">•</span>
                                )}
                                {postData?.albumName && (
                                  <div>
                                    <span className="text-muted-foreground">Album: </span>
                                    <span className="font-medium">{postData.albumName}</span>
                                  </div>
                                )}
                              </div>
                            ) : null}
                            {(() => {
                              const filteredGenres = postData?.genres?.filter(genre =>
                                genre.toLowerCase() !== 'music'
                              ) || [];
                              if (filteredGenres.length === 0) return null;
                              return (
                                <>
                                  <div className="border-t border-border/30 mx-4" />
                                  <div className="flex flex-wrap gap-2 justify-center">
                                    {filteredGenres.map((genre, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted/30 text-muted-foreground border border-border/50"
                                      >
                                        {genre}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        {/* Description - only show if post has a real user */}
                        {postData?.username && (
                          <PostDescriptionCard
                            username={postData.username}
                            description={postData?.description || ''}
                            createdAt={postData?.createdAt}
                            conversionSuccessCount={ownerVisibleConversionCount}
                            likeCount={postData?.likeCount ?? 0}
                            likedByCurrentUser={Boolean(postData?.likedByCurrentUser)}
                            isLikePending={isLikePending}
                            onToggleLike={handleToggleLike}
                            canRepost={canRepost}
                            hasReposted={hasReposted}
                            isRepostPending={isRepostPending}
                            onRepost={() => void handleRepost()}
                            className="relative z-20"
                          />
                        )}
                        {/* Streaming Links */}
                        <div className="p-6 rounded-2xl border border-border bg-card shadow-lg relative z-10">
                          <h3 className="text-lg font-semibold text-card-foreground mb-4">Listen Now</h3>
                          {isPlaylist ? (
                            <PlaylistStreamingLinks
                              links={convertedUrls}
                              className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                              playlistId={postData?.musicElementId || ''}
                              postId={postData?.postId || postId}
                              playlistTrackCount={playlistTrackCount}
                              sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                              sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                            />
                          ) : (
                            <StreamingLinks
                              links={convertedUrls}
                              postId={postData?.postId || postId}
                              elementType={metadata.type}
                              sourcePlatform={analyticsSourcePlatform}
                              isAuthenticated={isAuthenticated}
                              className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                            />
                          )}
                        </div>
                        {showAddToProfile && (
                          <div className="flex justify-center">
                            <Button
                              onClick={handleAddToProfile}
                              disabled={isAddingToProfile || addStatus === 'added'}
                              className="h-12 px-8 font-bold tracking-wide font-atkinson"
                            >
                              {addStatus === 'added' ? 'Added to Profile' : addStatus === 'error' ? 'Failed to Add' : 'Add Post to Profile'}
                            </Button>
                          </div>
                        )}
                        {showSignupCTA && (
                          <JoinCassetteCTA onClick={handleSignupClick} />
                        )}
                        {/* Support Us - Minimal */}
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm text-muted-foreground">
                            <span className="text-foreground font-medium">Enjoying Cassette?</span> Support us on Ko-fi.
                          </p>
                          <button
                            onClick={openKoFiSupport}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                            style={{
                              backgroundColor: palette?.complementary || 'var(--primary)',
                              color: palette?.complementary && ColorExtractor.isLightColor(palette.complementary) ? '#1F2327' : '#FFFFFF',
                            }}
                            aria-label="Support Cassette on Ko-fi"
                          >
                            <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={16} height={16} className="rounded-full" />
                            <span>Tip us</span>
                          </button>
                        </div>
                        {/* Report Problem */}
                        <div className="mb-[calc(6rem+env(safe-area-inset-bottom))] flex justify-center">
                          <button
                            onClick={() => openReportModal({
                          sourceContext: 'post_view',
                          sourceLink: postData?.originalUrl || sourceUrlRef.current || '',
                          conversionData: {
                            elementType: metadata.type,
                            title: metadata.title,
                            artist: metadata.artist,
                            platforms: postData?.convertedUrls,
                          },
                        })}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span>Report a Problem</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          // Mobile Layout
          <div className="px-4 sm:px-6 md:px-8 pb-8 pt-16 max-w-lg mx-auto">
            {/* Header Toolbar */}
            <div className="pt-4 pb-6 max-w-7xl mx-auto w-full">
              <div className="flex items-center justify-between gap-3">
                <BackButton route={backRoute} fallbackRoute="/explore" />
                <motion.button
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border font-medium text-sm overflow-hidden ${
                    copyState === 'copied'
                      ? 'bg-success/20 text-success-text border-success/30'
                      : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                  }`}
                  onClick={handleShare}
                  aria-label="Share"
                  whileTap={{ scale: 0.95 }}
                  animate={copyState === 'copied' ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {copyState === 'copied' ? (
                      <motion.span
                        key="copied"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="share"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="w-4 h-4" />
                        <span>Share</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                {/* More Menu */}
                {isOwnPost && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwnPost && (
                        <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {isOwnPost && (
                        <DropdownMenuItem
                          onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="text-center space-y-4 sm:space-y-6">
              {/* Element Type */}
              <div>
                <UIText className="text-foreground font-bold mb-4 sm:mb-6 uppercase tracking-wider text-sm sm:text-base">
                  {typeLabel}
                </UIText>
              </div>

              {/* Album Art Container */}
              <div>
                {/* Album Art with Shadow */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                  <Image
                    src={imageError || !metadata.artwork ? '/images/cassette_logo.png' : metadata.artwork}
                    alt={metadata.title}
                    width={0}
                    height={0}
                    sizes="(max-width: 640px) 220px, 280px"
                    className="relative rounded-xl object-cover shadow-lg w-[220px] h-[220px] sm:w-[280px] sm:h-[280px]"
                    priority
                    onError={() => setImageError(true)}
                    unoptimized={!imageError && !!metadata.artwork}
                  />

                  {/* Play Preview for Tracks only */}
                  {isTrack && postData?.previewUrl && (
                    <div className="absolute -bottom-4 -right-2">
                      <PlayPreview
                        previewUrl={postData.previewUrl}
                        title={metadata.title}
                        artist={metadata.artist}
                        artwork={metadata.artwork}
                        mobile={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Track Information Card - Mobile */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-lg">
                <div className="space-y-3 sm:space-y-4">
                  {/* Title */}
                  <HeadlineText className="text-lg sm:text-xl font-bold text-foreground text-center leading-tight">
                    {metadata.title}
                  </HeadlineText>

                  {/* Artists with roles (show for Track/Album) */}
                  {(isTrack || isAlbum) && (
                    <div className="text-center">
                      <BodyText className="text-sm sm:text-base text-muted-foreground">
                        {postData?.details?.artists && postData.details.artists.length > 0 ? (
                          postData.details.artists.map((artist, idx) => (
                            <span key={idx}>
                              {artist.name}
                              {artist.role === 'Featured' && <span className="text-sm"> (feat.)</span>}
                              {idx < postData.details!.artists!.length - 1 && ', '}
                            </span>
                          ))
                        ) : (
                          metadata.artist
                        )}
                      </BodyText>
                    </div>
                  )}

                  {/* Separator */}
                  <div className="border-t border-border/30" />

                  {/* Metadata */}
                  {isPlaylist ? (
                    <div className="space-y-3 text-sm">
                      {/* Show track count - prefer actual tracks array length, fall back to trackCount metadata */}
                      {(Array.isArray(postData?.tracks) && postData.tracks.length > 0) ? (
                        <div className="flex flex-wrap justify-center gap-3">
                          <div>
                            <span className="text-muted-foreground">Tracks: </span>
                            <span className="font-medium">{postData.tracks.length}</span>
                          </div>
                        </div>
                      ) : typeof postData?.trackCount === 'number' && postData.trackCount > 0 ? (
                        <div className="flex flex-wrap justify-center gap-3">
                          <div>
                            <span className="text-muted-foreground">Tracks: </span>
                            <span className="font-medium">{postData.trackCount}</span>
                          </div>
                        </div>
                      ) : null}
                      {/* Source attribution badge */}
                      {sourcePlatformKey && resolvedSourceUrl && sourceService && (
                        <a
                          href={resolvedSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            void captureClientEvent('streaming_link_opened', {
                              route: `/post/${postData?.postId || postId}`,
                              source_surface: 'post',
                              source_platform: sourcePlatformKey === 'appleMusic'
                                ? 'apple'
                                : sourcePlatformKey ?? 'unknown',
                              source_domain: resolvedSourceUrl,
                              post_id: postData?.postId || postId,
                              element_type: metadata.type as 'track' | 'album' | 'artist' | 'playlist',
                              is_authenticated: isAuthenticated,
                            });
                          }}
                          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                        >
                          <Image
                            src={sourceService.icon}
                            alt={sourceService.name}
                            width={16}
                            height={16}
                            className="opacity-70 group-hover:opacity-100 transition-opacity"
                          />
                          <span>from {sourceService.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                    </div>
                  ) : isTrack ? (
                    <div className="space-y-2 text-sm">
                      {/* Duration and Album in one line */}
                      <div className="flex flex-wrap justify-center gap-3">
                        {postData?.metadata?.duration && (
                          <div>
                            <span className="text-muted-foreground">Duration: </span>
                            <span className="font-medium">{postData.metadata.duration}</span>
                          </div>
                        )}

                        {postData?.metadata?.duration && postData?.albumName && (
                          <span className="text-muted-foreground">•</span>
                        )}

                        {postData?.albumName && (
                          <div>
                            <span className="text-muted-foreground">Album: </span>
                            <span className="font-medium">{postData.albumName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isAlbum ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-wrap justify-center gap-3">
                        {postData?.releaseDate && (
                          <div>
                            <span className="text-muted-foreground">Released: </span>
                            <span className="font-medium">{postData.releaseDate}</span>
                          </div>
                        )}
                        {postData?.releaseDate && postData?.trackCount && (
                          <span className="text-muted-foreground">•</span>
                        )}
                        {typeof postData?.trackCount === 'number' && (
                          <div>
                            <span className="text-muted-foreground">Tracks: </span>
                            <span className="font-medium">{postData.trackCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Genres */}
                  {(() => {
                    const filteredGenres = postData?.genres?.filter(genre =>
                      genre.toLowerCase() !== 'music'
                    ) || [];

                    if (filteredGenres.length === 0) return null;

                    return (
                      <>
                        <div className="border-t border-border/30" />
                        <div className="flex flex-wrap gap-2 justify-center">
                          {filteredGenres.map((genre, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-muted/30 text-muted-foreground border border-border/50"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Track list for album/playlist - mobile */}
              {showTracks && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
                  <div className="p-3 sm:p-4 border-b border-border bg-muted/50">
                    <h3 className="text-sm sm:text-base font-semibold text-foreground text-center">
                      {isPlaylist ? 'Playlist Tracks' : 'Album Tracks'}
                    </h3>
                  </div>
                  <TrackList
                    items={postData.tracks!}
                    artwork={metadata.artwork}
                    albumArtist={metadata.artist}
                    variant={isAlbum ? 'album' : 'playlist'}
                    compact
                    scrollable={true}
                    className="!border-0 !bg-transparent !shadow-none"
                    sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                  />
                </div>
              )}

              {/* User info and description - only show if post has a real user */}
              {postData?.username && (
                <PostDescriptionCard
                  username={postData.username}
                  description={postData?.description || ''}
                  createdAt={postData?.createdAt}
                  conversionSuccessCount={ownerVisibleConversionCount}
                  likeCount={postData?.likeCount ?? 0}
                  likedByCurrentUser={Boolean(postData?.likedByCurrentUser)}
                  isLikePending={isLikePending}
                  onToggleLike={handleToggleLike}
                  canRepost={canRepost}
                  hasReposted={hasReposted}
                  isRepostPending={isRepostPending}
                  onRepost={() => void handleRepost()}
                  className="text-left relative z-20"
                />
              )}
              {hasPostOwner && (
                <PostCommentsCard
                  postId={postData?.postId || postId}
                  isVisible={true}
                  commentsEnabled={postData?.commentsEnabled ?? true}
                  currentUserId={user?.id}
                  currentUsername={user?.username}
                  className="text-left relative z-20"
                />
              )}

              {/* Streaming Links Container */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-lg relative z-10">
                <h3 className="text-base sm:text-lg font-semibold text-card-foreground mb-3 sm:mb-4 text-center">Listen Now</h3>
                {isPlaylist ? (
                  <PlaylistStreamingLinks
                    links={convertedUrls}
                    className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                    playlistId={postData?.musicElementId || ''}
                    postId={postData?.postId || postId}
                    playlistTrackCount={playlistTrackCount}
                    sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                    sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                  />
                ) : (
                  <StreamingLinks
                    links={convertedUrls}
                    postId={postData?.postId || postId}
                    elementType={metadata.type}
                    sourcePlatform={analyticsSourcePlatform}
                    isAuthenticated={isAuthenticated}
                    className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                  />
                )}
              </div>
              {showAddToProfile && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleAddToProfile}
                    disabled={isAddingToProfile || addStatus === 'added'}
                    className="h-12 px-8 font-bold tracking-wide font-atkinson"
                  >
                    {addStatus === 'added' ? 'Added to Profile' : addStatus === 'error' ? 'Failed to Add' : 'Add Post to Profile'}
                  </Button>
                </div>
              )}
              {showSignupCTA && (
                <JoinCassetteCTA onClick={handleSignupClick} />
              )}
              {/* Support Us - Minimal */}
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Enjoying Cassette?</span> Support us on Ko-fi.
                </p>
                <button
                  onClick={openKoFiSupport}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{
                    backgroundColor: palette?.complementary || 'var(--primary)',
                    color: palette?.complementary && ColorExtractor.isLightColor(palette.complementary) ? '#1F2327' : '#FFFFFF',
                  }}
                  aria-label="Support Cassette on Ko-fi"
                >
                  <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={16} height={16} className="rounded-full" />
                  <span>Tip us</span>
                </button>
              </div>

              {/* Report Problem Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => openReportModal({
                    sourceContext: 'post_view',
                    sourceLink: postData?.originalUrl || sourceUrlRef.current || '',
                    conversionData: {
                      elementType: metadata.type,
                      title: metadata.title,
                      artist: metadata.artist,
                      platforms: postData?.convertedUrls,
                    },
                  })}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Report a Problem</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal - always render to allow Radix UI animations */}
      <EditPostModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        postId={postId}
        currentDescription={postData?.description || ''}
        currentPrivacy={(postData?.privacy as 'public' | 'private' | 'subscriber' | undefined) ?? 'public'}
        currentCommentsEnabled={postData?.commentsEnabled ?? true}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Modal - always render to allow Radix UI animations */}
      <DeletePostModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        postId={postId}
        postTitle={postData?.metadata?.title || 'this post'}
        onSuccess={handleDeleteSuccess}
      />

      <AuthPromptModal
        open={likeAuthPromptOpen}
        onOpenChange={setLikeAuthPromptOpen}
        title="Sign in to like posts"
        description="Create an account or sign in to like posts and keep track of your favorites."
      />

    </div>
  );
}
