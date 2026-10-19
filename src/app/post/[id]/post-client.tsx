'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { MusicLinkConversion, ElementType, InternalSignupLinkTemplate, PostByIdResponse, PostPrivacy, PublicPostPageMetadata } from '@/types';
import { normalizePlatformKey, parsePostResponse, type NormalizedPlatformKey, type PostPageData } from '@/services/post-response';
import { EntitySkeleton, printedBand } from '@/components/features/entity/entity-skeleton';
import { StreamingLinks } from '@/components/features/entity/streaming-links';
import { PlaylistCopyActions } from '@/components/features/entity/playlist-copy-actions';
import {
  curatorLinkCaption,
  curatorListenRows,
  playlistCopyTargets,
  sharesCassetteSpotifyCopy,
} from '@/lib/playlist-copy-placement';
import type { LinkOriginDimension } from '@/lib/analytics/events';
import { ACTIVE_PLATFORM_UI_KEYS } from '@/lib/platforms';
import { CassetteSpotifyCopyLink, CASSETTE_SPOTIFY_COPY_CAPTION } from '@/components/features/entity/cassette-spotify-copy-link';
import { PlayPreview } from '@/components/features/entity/play-preview';
import { TrackList, EXPANDABLE_MIN_TRACKS, formatTrackListDuration, formatTrackListStats } from '@/components/features/entity/track-list';
import { PostAuthorHeader } from '@/components/features/post/post-author-header';
import { PostEngagementBar } from '@/components/features/post/post-engagement-bar';
import { PostCommentsSheet } from '@/components/features/post/post-comments-sheet';
import { PostStudioColumn, PostStudioSheet } from '@/components/features/post/post-studio-panel';
import { EditPostModal, type PostChanges } from '@/components/features/post/edit-post-modal';
import { DeletePostModal } from '@/components/features/post/delete-post-modal';
import { AuthPromptModal } from '@/components/features/auth-prompt-modal';
import { PostShareMenu } from '@/components/features/post/post-share-menu';
import { PostContextMenu } from '@/components/features/post/post-context-menu';
import { useReportIssue } from '@/providers/report-issue-provider';
import { takePrefetchedPost } from '@/lib/post-prefetch';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AnimatedColorBackground } from '@/components/ui/animated-color-background';
import { PostLabelHead, postLabelMeta, bandTone } from '@/components/features/post/post-label-head';
import { ColorExtractor, ColorPalette } from '@/services/color-extractor';
import { MainContainer } from '@/components/ui/container';
import { HeadlineText, BodyText } from '@/components/ui/typography';
import { ArtworkImage, preloadArtwork } from '@/components/ui/artwork-image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError, apiService } from '@/services/api';
import { useAddMusicToProfile } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { AlertCircle, MoreVertical, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { openKoFiSupport } from '@/lib/ko-fi';
import { KofiIcon } from '@/components/ui/kofi-icon';
import { detectContentType } from '@/utils/content-type-detection';
import { captureClientEvent } from '@/lib/analytics/client';
import { getDeviceCategory, getUserCohort } from '@/lib/analytics/audience';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';
import { buildAttributedPostPath } from '@/lib/attribution/attribution-links';
import { toast } from 'sonner';
import { playCopyConfirm, playErrorTone, playLikePop } from '@/lib/sounds';
import { useQueryClient } from '@tanstack/react-query';
import { appLogger } from '@/lib/observability/logger';
import { captureUiException } from '@/lib/observability/error-reporting';
import { ApiConnectionError } from '@/utils/api-connection-error';
import { canShareWebContent, shareWebContent } from '@/utils/web-share';
import { tryStorage } from '@/lib/best-effort';
import { listProgress, statsSlideUnderLid, titleUnder, trackCounterText, trackStatsUnderLid } from '@/components/features/post/toolbar-scroll';

function PostFoot({
  signUp,
  addToProfile,
  onReport,
}: {
  signUp?: () => void;
  addToProfile?: { onClick: () => void; disabled: boolean; label: string };
  onReport: () => void;
}) {
  return (
    <footer className="space-y-4 border-t border-border/70 pt-5">
      {signUp && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/80">
            <span className="font-medium text-foreground">New here?</span> Create a free account to save your music.
          </p>
          <Button onClick={signUp} className="shrink-0 font-atkinson font-bold tracking-wide">
            Sign up free
          </Button>
        </div>
      )}
      {addToProfile && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/80">Save this post to your profile.</p>
          <Button
            onClick={addToProfile.onClick}
            data-testid="post-add-to-profile"
            disabled={addToProfile.disabled}
            className="shrink-0 font-atkinson font-bold tracking-wide"
          >
            {addToProfile.label}
          </Button>
        </div>
      )}
      <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/80">
        <button
          type="button"
          onClick={openKoFiSupport}
          aria-label="Support Cassette on Ko-fi"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <KofiIcon width={14} className="rounded-full" />
          <span>Support Cassette on Ko-fi</span>
        </button>
        <button
          type="button"
          onClick={onReport}
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <AlertCircle className="h-4 w-4" />
          <span>Report a Problem</span>
        </button>
      </p>
    </footer>
  );
}

interface PostClientPageProps {
  postId: string;
  initialMetadata?: PublicPostPageMetadata | null;
}

/**
 * How long a loaded post waits for its artwork to decode and its palette to resolve, so it
 * paints once, with the artwork in place and the label band in the artwork's color. Both
 * start as the page mounts (the server already knows the cover), so the wait is usually zero.
 */
const POST_VISUALS_WAIT_MS = 400;

/** How long after the owner column mounts it re-centers without a glide (see centerOnPostCard). */
const COLUMN_SETTLE_MS = 800;

type PostLoadError = {
  kind: 'unavailable' | 'session' | 'error';
};

type PostLikeResponse = {
  success: boolean;
  postId: string;
  liked: boolean;
  likeCount: number;
};

const REPOSTED_POSTS_STORAGE_KEY = 'cassette_reposted_posts_v1';
const COMMENTS_PADDING_TRANSITION_MS = 450;

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
  tryStorage(() => {
    const raw = window.localStorage.getItem(REPOSTED_POSTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, Record<string, true>> : {};
    const currentUserPosts = parsed[userId] || {};
    currentUserPosts[targetPostId] = true;
    parsed[userId] = currentUserPosts;
    window.localStorage.setItem(REPOSTED_POSTS_STORAGE_KEY, JSON.stringify(parsed));
  }, undefined);
};

const unmarkPostAsReposted = (userId: string | undefined, targetPostId: string | undefined) => {
  if (!userId || !targetPostId || typeof window === 'undefined') return;
  tryStorage(() => {
    const raw = window.localStorage.getItem(REPOSTED_POSTS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Record<string, true>>;
    const currentUserPosts = parsed[userId] || {};
    if (currentUserPosts[targetPostId]) {
      delete currentUserPosts[targetPostId];
    }
    parsed[userId] = currentUserPosts;
    window.localStorage.setItem(REPOSTED_POSTS_STORAGE_KEY, JSON.stringify(parsed));
  }, undefined);
};

export default function PostClientPage({ postId, initialMetadata }: PostClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuthState();
  const isTeamAccount = isCassetteInternalAccount(user?.accountType ?? null);
  const { mutate: addToProfile, isPending: isAddingToProfile } = useAddMusicToProfile();
  const [addStatus, setAddStatus] = useState<'idle' | 'added' | 'error'>('idle');
  const [postData, setPostData] = useState<PostPageData | null>(null);
  const [arrivedFromConversionHandoff, setArrivedFromConversionHandoff] = useState(false);
  const [error, setError] = useState<PostLoadError | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [palette, setPalette] = useState<ColorPalette | null>(null);
  const preparedVisuals = useRef(new Map<string, Promise<ColorPalette>>());
  const prepareVisuals = useCallback((artworkUrl: string) => {
    let prepared = preparedVisuals.current.get(artworkUrl);
    if (!prepared) {
      prepared = Promise.all([
        preloadArtwork(artworkUrl),
        ColorExtractor.extractPalette(artworkUrl).catch(() => ColorExtractor.getBrandPalette()),
      ]).then(([, extracted]) => extracted);
      // Holds only a preparation in flight; a finished one lives on in the artwork and palette
      // caches, and a failed one is tried again.
      preparedVisuals.current.set(artworkUrl, prepared);
      void prepared.finally(() => preparedVisuals.current.delete(artworkUrl));
    }
    return prepared;
  }, []);
  const initialArtwork = initialMetadata?.imageUrl;
  useEffect(() => {
    if (initialArtwork) void prepareVisuals(initialArtwork);
  }, [initialArtwork, prepareVisuals]);
  const handleSignupClick = () => router.push('/auth/signup');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [imageError, setImageError] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRepostPending, setIsRepostPending] = useState(false);
  const [hasReposted, setHasReposted] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [likeAuthPromptOpen, setLikeAuthPromptOpen] = useState(false);
  const [commentsSheetOpen, setCommentsSheetOpen] = useState(false);
  const [commentCount, setCommentCount] = useState<number | undefined>(undefined);
  const [studioPanelOpen, setStudioPanelOpen] = useState(false);
  const panelSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Outlasts the sheet's `data-[state=closed]:duration-280` slide-out, so the
  // outgoing panel finishes before the incoming one starts.
  const PANEL_SWITCH_DELAY_MS = 320;

  const handleOpenComments = useCallback(() => {
    if (panelSwitchTimeoutRef.current) {
      clearTimeout(panelSwitchTimeoutRef.current);
      panelSwitchTimeoutRef.current = null;
    }
    if (commentsSheetOpen) {
      setCommentsSheetOpen(false);
      return;
    }
    if (studioPanelOpen) {
      setStudioPanelOpen(false);
      panelSwitchTimeoutRef.current = setTimeout(() => {
        setCommentsSheetOpen(true);
        panelSwitchTimeoutRef.current = null;
      }, PANEL_SWITCH_DELAY_MS);
      return;
    }
    setCommentsSheetOpen(true);
  }, [commentsSheetOpen, studioPanelOpen]);

  const handleOpenStudio = useCallback(() => {
    if (panelSwitchTimeoutRef.current) {
      clearTimeout(panelSwitchTimeoutRef.current);
      panelSwitchTimeoutRef.current = null;
    }
    if (studioPanelOpen) {
      setStudioPanelOpen(false);
      return;
    }
    if (commentsSheetOpen) {
      setCommentsSheetOpen(false);
      panelSwitchTimeoutRef.current = setTimeout(() => {
        setStudioPanelOpen(true);
        panelSwitchTimeoutRef.current = null;
      }, PANEL_SWITCH_DELAY_MS);
      return;
    }
    setStudioPanelOpen(true);
  }, [commentsSheetOpen, studioPanelOpen]);

  useEffect(() => {
    return () => {
      if (panelSwitchTimeoutRef.current) {
        clearTimeout(panelSwitchTimeoutRef.current);
      }
    };
  }, []);
  const { openReportModal } = useReportIssue();
  const fromParam = searchParams.get('from');
  const backRoute =
    fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//')
      ? fromParam
      : undefined;

  const handleDeleteSuccess = useCallback(() => {
    router.push(backRoute ?? '/studio/music');
  }, [router, backRoute]);

  const handleEditSuccess = useCallback((changes: PostChanges) => {
    setPostData((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  const sourceUrlRef = useRef<string | null>(null);
  const sourcePlatformRef = useRef<string | null>(null);
  const trackedPostViewRef = useRef<string | null>(null);

  useEffect(() => {
    setAddStatus('idle');
    setImageError(false);
  }, [postData?.postId, postData?.originalUrl]);

  useEffect(() => {
    trackedPostViewRef.current = null;
  }, [postId]);

  const buildShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
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
      curator_id: postData?.curatorId ?? undefined,
      is_member_view: postData?.isMemberView === true,
      ...(isTeamAccount ? { source_context: 'share_menu_plain' } : {}),
    });

    const shareUrl = buildShareUrl();
    if (!shareUrl) return;

    const shareTitle = postData?.metadata?.title || 'Music';
    const shareArtist = postData?.metadata?.artist;
    const shareText = shareArtist
      ? `Check out "${shareTitle}" by ${shareArtist} on Cassette`
      : `Check out "${shareTitle}" on Cassette`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window && window.innerWidth < 1024);

    if (canShareWebContent() && isMobile) {
      try {
        await shareWebContent({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        appLogger.warn('post_share_failed', { error: err, route: '/post/[id]' });
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopyState('copied');
        playCopyConfirm();
      } catch (err) {
        appLogger.warn('post_share_copy_failed', { error: err, route: '/post/[id]' });
        setCopyState('error');
        playErrorTone();
        setTimeout(() => setCopyState('idle'), 2000);
      }
    }
  }, [buildShareUrl, postData?.metadata?.title, postData?.metadata?.artist, postData?.postId, postData?.metadata?.type, postData?.curatorId, postData?.isMemberView, postId, user?.id, isAuthenticated, isTeamAccount]);

  const handleAttributedCopy = useCallback(async (template: InternalSignupLinkTemplate) => {
    const resolvedPostId = postData?.postId || postId;
    if (!resolvedPostId || typeof window === 'undefined') return;

    const shareUrl = `${window.location.origin}${buildAttributedPostPath(resolvedPostId, template)}`;

    void captureClientEvent('post_shared', {
      route: `/post/${resolvedPostId}`,
      source_surface: 'post',
      post_id: resolvedPostId,
      element_type: postData?.metadata?.type as 'track' | 'album' | 'artist' | 'playlist' | undefined,
      source_platform: sourcePlatformRef.current as 'spotify' | 'apple' | 'deezer' | 'unknown' | undefined,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
      source_context: 'share_menu_template',
      traffic_source: template.source,
      traffic_medium: template.medium ?? undefined,
      traffic_campaign: template.campaign ?? undefined,
      traffic_content: `post-${resolvedPostId}`,
      curator_id: postData?.curatorId ?? undefined,
      is_member_view: postData?.isMemberView === true,
    });

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      playCopyConfirm();
    } catch (err) {
      appLogger.warn('post_share_copy_failed', { error: err, route: '/post/[id]' });
      setCopyState('error');
      playErrorTone();
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [postData?.postId, postData?.metadata?.type, postData?.curatorId, postData?.isMemberView, postId, user?.id, isAuthenticated]);

  const handleAddToProfile = useCallback(() => {
    const musicElementId = postData?.musicElementId;
    const elementType = postData?.metadata?.type;

    if (!musicElementId || elementType === undefined) {
      appLogger.warn('post_add_to_profile_missing_metadata', { route: '/post/[id]', element_type: elementType });
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
          appLogger.error('post_add_to_profile_failed', { error, route: '/post/[id]', element_type: elementType });
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
  const normalizedPrivacy = (postData?.privacy || 'public').toLowerCase();
  const isPublicPost = normalizedPrivacy === 'public';
  const studioPrivacy: PostPrivacy =
    normalizedPrivacy === 'private' || normalizedPrivacy === 'subscriber' || normalizedPrivacy === 'friends'
      ? normalizedPrivacy
      : 'public';
  const canRepost = Boolean(isAuthenticated && hasOwner && !isOwnPost && (isPublicPost || hasReposted));

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

    if (optimisticLiked) {
      playLikePop();
    }

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

  useEffect(() => {
    let isCancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxWaitMs = 60_000;
    const defaultRetryMs = 400;

    const shouldRetryFetchPost = (error: unknown) => {
      if (error instanceof ApiConnectionError) return true;
      if (error instanceof ApiError) {
        if (error.apiStatus === 'failed') return false;
        if (error.apiStatus === 'processing') return true;
        const status = error.status || 0;
        return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
      }
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('timed out') || message.includes('network') || message.includes('fetch');
      }
      return false;
    };

    const fetchPost = async () => {
      try {
        setError(null);

        const startedAt = Date.now();
        let response: Awaited<ReturnType<typeof apiService.fetchPostById>> | null =
          takePrefetchedPost(postId);
        if (response) setArrivedFromConversionHandoff(true);

        while (!response && Date.now() - startedAt < maxWaitMs) {
          if (isCancelled) return;
          try {
            response = await apiService.fetchPostById(postId);
          } catch (fetchError) {
            if (!shouldRetryFetchPost(fetchError)) {
              throw fetchError;
            }
            const retryAfterMs = fetchError instanceof ApiError && typeof fetchError.retryAfterMs === 'number'
              ? fetchError.retryAfterMs
              : defaultRetryMs;
            await sleep(Math.max(100, retryAfterMs));
          }
        }

        if (isCancelled) return;

        if (!response) {
          throw new Error('Post is still finalizing. Please try again in a moment.');
        }

        const applyResponse = async (payload: PostByIdResponse) => {
          const data = parsePostResponse(payload, postId);
          // After a conversion, the skeleton has usually shown the artwork already, so this is instant.
          const visuals = data.metadata.artwork
            ? await Promise.race([prepareVisuals(data.metadata.artwork), sleep(POST_VISUALS_WAIT_MS).then(() => null)])
            : null;
          if (isCancelled) return;
          setError(null);
          sourceUrlRef.current = data.originalUrl || sourceUrlRef.current;
          sourcePlatformRef.current = data.sourcePlatform || sourcePlatformRef.current;
          setPostData(data);
          const repostedByApi = Boolean(data.repostedByCurrentUser);
          const repostedFromLocal = Boolean(readRepostedPosts(user?.id)[payload.postId || postId]);
          setHasReposted(repostedByApi || repostedFromLocal);

          if (visuals) {
            setPalette(visuals);
          } else if (data.metadata.artwork) {
            extractColorFromArtwork(data.metadata.artwork);
          }
        };

        if (!response.success) {
          throw new Error('Invalid response format');
        }

        await applyResponse(response);

      } catch (e) {
        if (isCancelled) return;
        captureUiException(e, { route: '/post/[id]', operation: 'post_load' });
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          setError({ kind: 'unavailable' });
        } else if (e instanceof ApiError && e.status === 401) {
          setError({ kind: 'session' });
        } else {
          setError({ kind: 'error' });
        }
      }
    };

    void fetchPost();
    return () => {
      isCancelled = true;
    };
  }, [postId, user?.id, isAuthenticated, loadAttempt, prepareVisuals]);

  useEffect(() => {
    if (isLoading || !postData) {
      return;
    }

    const matchesRoutePost = [postData.postId, postData.redirectPostId, postData.originalPostId]
      .some((candidate) => candidate === postId);
    if (!matchesRoutePost) {
      return;
    }

    const resolvedPostId = postData.postId || postId;
    if (!resolvedPostId || trackedPostViewRef.current === resolvedPostId) {
      return;
    }

    const isCreatorView = Boolean(
      user?.id &&
      postData.userId &&
      user.id.toLowerCase() === postData.userId.toLowerCase(),
    );

    trackedPostViewRef.current = resolvedPostId;
    void captureClientEvent('post_viewed', {
      route: `/post/${resolvedPostId}`,
      source_surface: 'post',
      post_id: resolvedPostId,
      element_type: postData.metadata.type as 'track' | 'album' | 'artist' | 'playlist' | undefined,
      source_platform: (postData.sourcePlatform || sourcePlatformRef.current || undefined) as 'spotify' | 'apple' | 'deezer' | 'unknown' | undefined,
      user_id: user?.id,
      is_authenticated: isAuthenticated,
      is_creator_view: isCreatorView,
      paid_promotion_campaign_id: postData.paidPromotionCampaignId ?? undefined,
      curator_id: postData.curatorId ?? undefined,
      is_member_view: postData.isMemberView === true,
    });
    if (postData.isMemberView && postData.curatorId) {
      void captureClientEvent('member_post_viewed', {
        route: `/post/${resolvedPostId}`,
        source_surface: 'post',
        post_id: resolvedPostId,
        curator_id: postData.curatorId,
        is_member_view: true,
        user_cohort: getUserCohort(user?.id),
        device_category: getDeviceCategory(),
      });
    }
  }, [isLoading, isAuthenticated, postData, postId, user?.id]);

  const extractColorFromArtwork = async (artworkUrl: string) => {
    try {
      const result = await ColorExtractor.extractPalette(artworkUrl);
      setPalette(result);
    } catch (error) {
      appLogger.warn('post_artwork_color_extraction_failed', { error, route: '/post/[id]' });
      setPalette(ColorExtractor.getBrandPalette());
    }
  };

  const [isDesktop, setIsDesktop] = useState(false);
  const [hasColumnRoom, setHasColumnRoom] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 900);
      setHasColumnRoom(window.innerWidth >= 1280);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (hasColumnRoom) setStudioPanelOpen(false);
  }, [hasColumnRoom]);

  const [commentsPadded, setCommentsPadded] = useState(false);
  useEffect(() => {
    if (commentsSheetOpen) {
      setCommentsPadded(true);
      return;
    }
    const timeout = setTimeout(() => setCommentsPadded(false), COMMENTS_PADDING_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [commentsSheetOpen]);

  const postCardRef = useRef<HTMLDivElement>(null);
  const centerOnPostCard = useCallback((column: HTMLElement | null) => {
    const card = postCardRef.current;
    if (!column || !card) return;
    const mountedAt = performance.now();
    const observer = new ResizeObserver(() => {
      // The column's own reads (plans, Curator Pro) answer just after it mounts; it takes
      // that size in place. Later changes, such as a visibility switch, glide.
      // ponytail: a time window, not the reads' state; a read slower than this still glides.
      if (column.style.marginTop && performance.now() - mountedAt > COLUMN_SETTLE_MS) column.dataset.recentered = '';
      column.style.marginTop = `${Math.max(0, (card.offsetHeight - column.offsetHeight) / 2)}px`;
    });
    observer.observe(card);
    observer.observe(column);
    return () => observer.disconnect();
  }, []);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarLidRef = useRef<HTMLDivElement>(null);
  const trackCardRef = useRef<HTMLDivElement>(null);
  const trackStatsRef = useRef<HTMLSpanElement>(null);
  const trackCounterRef = useRef<HTMLSpanElement>(null);
  const [toolbarDock, setToolbarDock] = useState<'raised' | 'docked'>();
  const followScrollUnderToolbar = useCallback((title: HTMLElement | null) => {
    const toolbar = toolbarRef.current;
    const lid = toolbarLidRef.current;
    if (!title || !toolbar || !lid) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const set = (name: string, value: number | string) => toolbar.style.setProperty(name, String(value));
    let frame = 0;
    const update = () => {
      frame = 0;
      const lidBox = lid.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      const titleShare = titleUnder(lidBox, titleBox);
      set('--title-under', titleShare);
      setToolbarDock(titleShare === 1 ? 'docked' : window.scrollY > 0 ? 'raised' : undefined);

      const card = trackCardRef.current;
      const stats = trackStatsRef.current;
      const rows = card?.querySelectorAll<HTMLElement>('[data-track-row]');
      if (!card || !stats || !rows?.length) return;
      const statsBox = stats.getBoundingClientRect();
      const counts = rows.length >= EXPANDABLE_MIN_TRACKS;
      const under = trackStatsUnderLid({
        lid: lidBox,
        stats: statsBox,
        cardBottom: card.getBoundingClientRect().bottom,
        slides: statsSlideUnderLid(statsBox, lidBox, reducedMotion.matches),
        counts,
      });
      set('--stats-shift', `${under.statsShift}px`);
      set('--stats-visible', under.statsVisible);
      set('--counter-swap', under.counterSwap);
      set('--list-exit', `${under.listExit}px`);
      if (!counts) return;
      const unclippedListBottom = rows[0].parentElement?.parentElement?.getBoundingClientRect().bottom ?? Infinity;
      const passedLine = Math.min(lidBox.bottom, unclippedListBottom);
      let passed = 0;
      while (passed < rows.length && rows[passed].getBoundingClientRect().top < passedLine) passed += 1;
      const listTop = rows[0].getBoundingClientRect().top;
      const listBottom = Math.min(rows[rows.length - 1].getBoundingClientRect().bottom, unclippedListBottom);
      set('--list-progress', listProgress(lidBox.bottom, listTop, listBottom));
      if (trackCounterRef.current) trackCounterRef.current.textContent = trackCounterText(passed, rows.length);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    // The tracklist's refs attach after this one; measure again once the commit has finished.
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!postData && !error) {
    return (
      <>
        {initialMetadata && (
          <span className="sr-only">
            {initialMetadata.title}. {initialMetadata.description}
          </span>
        )}
        <EntitySkeleton
          contentType={initialMetadata?.elementType?.toLowerCase()}
          sourceLabel={initialMetadata?.elementType}
        />
      </>
    );
  }

  if (error && !postData) {
    const isUnavailable = error.kind === 'unavailable';
    const needsSession = error.kind === 'session';

    return (
      <div className="min-h-svh relative">
        <AnimatedColorBackground palette={palette} />
        <div className="relative z-10 min-h-svh flex items-center justify-center">
          <MainContainer className="text-center p-8">
            <div className="mb-4">
              <svg className="w-16 h-16 text-danger mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <HeadlineText className="mb-2">
              {isUnavailable
                ? 'MusicLink unavailable'
                : needsSession
                  ? 'Sign in to continue'
                  : 'Unable to load MusicLink'}
            </HeadlineText>
            <BodyText className="text-text-secondary mb-6">
              {isUnavailable
                ? 'This MusicLink may have been removed, made private, or you may not have access.'
                : needsSession
                  ? 'Your session has expired. Sign in again to view this MusicLink.'
                  : 'Cassette could not load this MusicLink. Please try again.'}
            </BodyText>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <BackButton variant="button" buttonVariant="outline" route={backRoute} fallbackRoute="/explore" className="h-10" />
              {(needsSession || (isUnavailable && !isAuthenticated)) && (
                <Button
                  onClick={() => router.push(`/auth/signin?redirect=${encodeURIComponent(`/post/${postId}`)}`)}
                  className="h-10"
                >
                  Sign in
                </Button>
              )}
              {error.kind === 'error' && (
                <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="h-10">
                  Try again
                </Button>
              )}
            </div>
          </MainContainer>
        </div>
      </div>
    );
  }

  const { metadata, convertedUrls } = postData as MusicLinkConversion;

  const showOwnerColumn = isOwnPost && hasColumnRoom;
  const ownerColumnBeside = showOwnerColumn && !commentsPadded;

  const ownerMenuItems = (
    <>
      <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
      {!showOwnerColumn && (
        <DropdownMenuItem onClick={() => { setDropdownOpen(false); if (!studioPanelOpen) handleOpenStudio(); }}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Access &amp; insights
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </>
  );

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
  const trackListDuration = Array.isArray(postData?.tracks) ? formatTrackListDuration(postData.tracks) : null;
  const trackListStats = Array.isArray(postData?.tracks) && postData.tracks.length > 0
    ? formatTrackListStats(postData.tracks)
    : typeof playlistTrackCount === 'number' && playlistTrackCount > 0
      ? `${playlistTrackCount} ${playlistTrackCount === 1 ? 'track' : 'tracks'}`
      : null;

  const ownerColumnProps = {
    postId: postData?.postId || postId,
    privacy: studioPrivacy,
    onPrivacyChange: (privacy: PostPrivacy) => setPostData((prev) => (prev ? { ...prev, privacy } : prev)),
    conversionSuccessCount: ownerVisibleConversionCount,
  };
  const showSignupCTA = !isLoading && !isAuthenticated;
  const filteredGenres = (postData?.genres ?? []).filter(
    (genre) => genre.toLowerCase() !== 'music',
  );
  const addToProfileAction = {
    onClick: handleAddToProfile,
    disabled: isAddingToProfile || addStatus === 'added',
    label: addStatus === 'added' ? 'Added to Profile' : addStatus === 'error' ? 'Failed to Add' : 'Add Post to Profile',
  };
  const openReport = () => openReportModal({
    sourceContext: 'post_view',
    sourceLink: postData?.originalUrl || sourceUrlRef.current || '',
    conversionData: {
      elementType: metadata.type,
      title: metadata.title,
      artist: metadata.artist,
      platforms: postData?.convertedUrls,
      postId: postData?.postId || postId,
    },
  });
  const labelKicker = (
    <>
      <span>{typeLabel}</span>
      {filteredGenres.map((genre) => (
        <span key={genre} className="font-normal tracking-[0.2em] opacity-80">{genre}</span>
      ))}
    </>
  );

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

  const printedByConversion = arrivedFromConversionHandoff && metadata.artwork ? printedBand(metadata.artwork) : null;
  const labelTint = printedByConversion
    ? printedByConversion.tint
    : (palette ?? (metadata.artwork ? ColorExtractor.cachedPalette(metadata.artwork) : undefined))?.vibrant;

  // What each listen row opens. A playlist opens its original on the service it came from, the
  // owner's own link where they set one, and Cassette's shared Spotify copy while Spotify copies go to
  // Cassette's account; every other service gets a button in the copy block instead, so a row never
  // builds a copy in a fan's account.
  const curatorLinks = isPlaylist ? postData?.curatorLinks ?? {} : {};
  const sharedSpotifyCopy =
    isPlaylist && sharesCassetteSpotifyCopy(sourcePlatformKey) && !convertedUrls.spotify && !curatorLinks.spotify;
  const cassetteSpotifyCopyUrl = sharedSpotifyCopy ? postData?.cassetteSpotifyCopyUrl : null;
  const listenLinks = { ...convertedUrls };
  const listenCaptions: Partial<Record<NormalizedPlatformKey, string>> = {};
  const linkOrigins: Partial<Record<NormalizedPlatformKey, LinkOriginDimension>> = {};
  for (const platform of ACTIVE_PLATFORM_UI_KEYS) {
    if (listenLinks[platform]) linkOrigins[platform] = platform === sourcePlatformKey ? 'source' : 'cassette';
  }
  if (isPlaylist && sourcePlatformKey) {
    listenCaptions[sourcePlatformKey] = 'Original playlist';
    linkOrigins[sourcePlatformKey] = 'source';
    if (resolvedSourceUrl) listenLinks[sourcePlatformKey] = resolvedSourceUrl;
  }
  if (cassetteSpotifyCopyUrl) {
    listenLinks.spotify = cassetteSpotifyCopyUrl;
    listenCaptions.spotify = CASSETTE_SPOTIFY_COPY_CAPTION;
    linkOrigins.spotify = 'cassette';
  }
  for (const [platform, url] of curatorListenRows(sourcePlatformKey, curatorLinks)) {
    listenLinks[platform] = url;
    listenCaptions[platform] = curatorLinkCaption(postData?.username);
    linkOrigins[platform] = 'curator';
  }
  const copyTargets = isPlaylist ? playlistCopyTargets(sourcePlatformKey, listenLinks) : [];
  const listenSection = (
    <div>
      <h3 className="sr-only">Listen on</h3>
      <StreamingLinks
        links={listenLinks}
        captions={listenCaptions}
        linkOrigins={linkOrigins}
        postId={postData?.postId || postId}
        elementType={metadata.type}
        sourcePlatform={analyticsSourcePlatform}
        isAuthenticated={isAuthenticated}
        paidPromotionCampaignId={postData?.paidPromotionCampaignId}
        curatorId={postData?.curatorId}
        isMemberView={postData?.isMemberView}
        className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
      />
      {sharedSpotifyCopy && !cassetteSpotifyCopyUrl && (
        <CassetteSpotifyCopyLink
          className="mt-2.5"
          playlistId={postData?.musicElementId || ''}
          postId={postData?.postId || postId}
          sourcePlatform={analyticsSourcePlatform}
          isAuthenticated={isAuthenticated}
          paidPromotionCampaignId={postData?.paidPromotionCampaignId}
          curatorId={postData?.curatorId}
          isMemberView={postData?.isMemberView}
        />
      )}
      {isPlaylist && (
        <PlaylistCopyActions
          targets={copyTargets}
          playlistId={postData?.musicElementId || ''}
          postId={postData?.postId || postId}
          playlistTrackCount={playlistTrackCount}
          sourceUrl={resolvedSourceUrl}
          sourcePlatform={sourcePlatformKey}
          paidPromotionCampaignId={postData?.paidPromotionCampaignId}
        />
      )}
    </div>
  );
  const artists = postData?.details?.artists;
  const artistLine = artists && artists.length > 0
    ? artists.map((artist, idx) => (
        <span key={idx}>
          {artist.name}
          {artist.role === 'Featured' && <span className="text-[0.85em]"> (feat.)</span>}
          {idx < artists.length - 1 && ', '}
        </span>
      ))
    : metadata.artist;
  const labelMeta = postLabelMeta(metadata.type, {
    duration: metadata.duration,
    albumName: postData?.albumName,
    releaseDate: postData?.releaseDate,
  });

  return (
    <div className="min-h-svh relative">
      <AnimatedColorBackground palette={palette} />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.10) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <PostContextMenu
        title={metadata.title}
        links={listenLinks}
        onListen={(url, platform) => {
          void captureClientEvent('streaming_link_opened', {
            route: `/post/${postData?.postId || postId}`,
            source_surface: 'post',
            source_platform: platform === 'appleMusic' ? 'apple' : platform,
            source_domain: url,
            post_id: postData?.postId || postId,
            element_type: metadata.type,
            is_authenticated: isAuthenticated,
            paid_promotion_campaign_id: postData?.paidPromotionCampaignId ?? undefined,
            curator_id: postData?.curatorId ?? undefined,
            is_member_view: postData?.isMemberView === true,
            source_context: 'context_menu',
            link_origin: linkOrigins[platform],
          });
        }}
        onShare={() => void handleShare()}
        liked={Boolean(postData?.likedByCurrentUser)}
        onToggleLike={() => void handleToggleLike()}
        onOpenComments={postData?.username && hasPostOwner ? handleOpenComments : undefined}
        canRepost={canRepost}
        hasReposted={hasReposted}
        onRepost={() => void handleRepost()}
        canAddToProfile={showAddToProfile && addStatus !== 'added'}
        onAddToProfile={handleAddToProfile}
        onReport={openReport}
        isOwner={isOwnPost}
        onEdit={() => setEditModalOpen(true)}
        onOpenStudio={showOwnerColumn ? undefined : () => { if (!studioPanelOpen) handleOpenStudio(); }}
        onDelete={() => setDeleteModalOpen(true)}
      >
      <div
        className={`relative z-10 min-h-svh transition-[padding] ease-out-quart ${arrivedFromConversionHandoff ? "" : "motion-safe:animate-focus-in"} ${commentsSheetOpen ? "md:pr-[512px]" : ""}`}
        style={{ transitionDuration: `${COMMENTS_PADDING_TRANSITION_MS}ms` }}
      >
        {isDesktop ? (
            <div className="flex min-h-svh flex-col pt-16 before:flex-1 after:min-h-20 after:flex-1">
              <div className={`mx-auto w-full px-8 pb-4 ${ownerColumnBeside ? 'max-w-7xl' : 'max-w-[68rem]'}`}>
                <div
                  ref={toolbarRef}
                  data-post-toolbar
                  data-dock={toolbarDock}
                  className={`group sticky top-[calc(var(--navbar-height)+0.5rem)] z-30 mb-6 mt-4 grid items-center ${ownerColumnBeside ? 'grid-cols-[minmax(0,1fr)_20rem] gap-x-8' : 'grid-cols-[minmax(0,1fr)_auto] gap-x-3'}`}
                >
                <div className="relative min-w-0">
                  <div
                    ref={toolbarLidRef}
                    aria-hidden
                    className="absolute inset-x-0 -inset-y-2 overflow-hidden rounded-t-lg border border-border/70 bg-card opacity-0 transition-opacity duration-200 ease-out-quart group-data-[dock]:opacity-100 group-data-[dock]:duration-300 motion-reduce:transition-none"
                  >
                    {showTracks && trackListStats && (
                      <>
                        {/* The tracklist's stats, kept: they stop at the lid's centre line and roll
                            over into the counter one line at a time, inside a one-line window. The lid
                            clips them on the way in and out; right-5 matches the tracklist header's
                            px-5, so the copy meets the real stats. */}
                        <div className="absolute inset-y-0 right-5 flex items-center text-sm tabular-nums text-muted-foreground opacity-[var(--stats-visible,0)] transition-opacity duration-200 ease-out-quart [transform:translateY(var(--stats-shift,0px))]">
                          <div className="grid h-5 justify-items-end overflow-hidden">
                            <span className="whitespace-nowrap [grid-area:1/1] opacity-[calc(1_-_var(--counter-swap,0))] motion-safe:[transform:translateY(calc(var(--counter-swap,0)*-20px))]">
                              {trackListStats}
                            </span>
                            <span className="whitespace-nowrap [grid-area:1/1] opacity-[var(--counter-swap,0)] motion-safe:[transform:translateY(calc((1_-_var(--counter-swap,0))*20px))]">
                              <span ref={trackCounterRef} className="font-semibold" style={{ color: bandTone(labelTint) }} />
                              {trackListDuration && ` · ${trackListDuration}`}
                            </span>
                          </div>
                        </div>
                        <div
                          className="absolute inset-x-0 bottom-0 h-[3px] origin-left opacity-[var(--counter-swap,0)] [transform:translateY(var(--list-exit,0px))_scaleX(var(--list-progress,0))]"
                          style={{ backgroundColor: bandTone(labelTint) }}
                        />
                      </>
                    )}
                  </div>
                  <div className="relative flex min-w-0 items-center gap-3 transition-[padding] duration-200 ease-out-quart group-data-[dock]:px-3 group-data-[dock]:duration-300 motion-reduce:transition-none">
                    <BackButton route={backRoute} fallbackRoute="/explore" className="shrink-0" />
                    <button
                      type="button"
                      aria-label="Back to the top of the post"
                      aria-hidden={toolbarDock !== 'docked'}
                      tabIndex={toolbarDock === 'docked' ? 0 : -1}
                      onClick={() => window.scrollTo({
                        top: 0,
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                      })}
                      className={`group/identity pointer-events-none flex min-w-0 items-center gap-3 rounded-sm opacity-[var(--title-under,0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[dock=docked]:pointer-events-auto motion-safe:[transform:translateY(calc((1_-_var(--title-under,0))*8px))] ${showTracks ? 'max-w-[calc(100%-17rem)]' : ''}`}
                    >
                      <ArtworkImage
                        src={imageError || !metadata.artwork ? '/images/cassette_logo.svg' : metadata.artwork}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 rounded-[3px] object-cover outline outline-1 -outline-offset-1 outline-foreground/10"
                        unoptimized={!imageError && !!metadata.artwork}
                      />
                      <span className="truncate text-sm font-semibold underline-offset-4 group-hover/identity:underline">
                        {metadata.title}
                      </span>
                      {isAlbum && metadata.artist && (
                        <span className="truncate text-sm text-muted-foreground">{metadata.artist}</span>
                      )}
                    </button>
                  </div>
                  </div>
                  <div className="flex items-center gap-1.5 justify-self-end">
                    <PostShareMenu
                      isTeamAccount={isTeamAccount}
                      copyState={copyState}
                      onPlainShare={handleShare}
                      onTemplateCopy={handleAttributedCopy}
                    />
                    {isOwnPost && (
                      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Post actions"
                            data-testid="post-actions-trigger"
                            className="rounded-full"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ownerMenuItems}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className={`grid items-start gap-x-8 ${ownerColumnBeside ? 'grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1'}`}>
                  <div className="min-w-0">
                    <div className="w-full">
                      <div className="space-y-6">
                        <div ref={postCardRef} className="card-ink grid grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] overflow-hidden">
                          <div className="flex flex-col bg-muted/40">
                            <div className="relative">
                              <ArtworkImage
                                src={imageError || !metadata.artwork ? '/images/cassette_logo.svg' : metadata.artwork}
                                alt={metadata.title}
                                width={416}
                                height={416}
                                className="block h-auto w-full object-cover"
                                priority
                                decoding="sync"
                                onError={() => setImageError(true)}
                                unoptimized={!imageError && !!metadata.artwork}
                              />
                              {isTrack && postData?.previewUrl && (
                                <div className="absolute bottom-3 right-3">
                                  <PlayPreview
                                    previewUrl={postData.previewUrl}
                                    title={metadata.title}
                                    artist={metadata.artist}
                                    artwork={metadata.artwork}
                                    postId={postData?.postId || postId}
                                    elementType="track"
                                    sourcePlatform={sourcePlatformKey === 'appleMusic' ? 'apple' : sourcePlatformKey ?? 'unknown'}
                                  />
                                </div>
                              )}
                            </div>
                            {postData?.username && hasPostOwner && (
                              <div className="relative z-20 flex flex-1 flex-col gap-2.5 p-5">
                                <PostAuthorHeader
                                  username={postData.username}
                                  description={postData?.description || ''}
                                  createdAt={postData?.createdAt}
                                  compact
                                />
                                <PostEngagementBar
                                  likeCount={postData?.likeCount ?? 0}
                                  likedByCurrentUser={Boolean(postData?.likedByCurrentUser)}
                                  isLikePending={isLikePending}
                                  onToggleLike={handleToggleLike}
                                  canRepost={canRepost}
                                  hasReposted={hasReposted}
                                  isRepostPending={isRepostPending}
                                  onRepost={() => void handleRepost()}
                                  commentCount={commentCount}
                                  commentsEnabled={postData?.commentsEnabled ?? true}
                                  onOpenComments={handleOpenComments}
                                  canManage={isOwnPost && !showOwnerColumn}
                                  privacy={studioPrivacy}
                                  onOpenStudio={handleOpenStudio}
                                  className="self-start"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col border-l border-border/70">
                          <PostLabelHead
                            titleRef={followScrollUnderToolbar}
                            kicker={labelKicker}
                            title={metadata.title}
                            artist={isTrack || isAlbum ? artistLine : undefined}
                            meta={labelMeta}
                            tint={labelTint}
                          />
                          <div className="flex flex-1 flex-col justify-center px-6 pb-6 pt-10">
                            {listenSection}
                          </div>
                          </div>
                        </div>
                        {showTracks && (
                          <div ref={trackCardRef} className="card-ink overflow-hidden">
                            <div className="px-5 py-4 border-b border-border flex items-baseline justify-between gap-3">
                              <h3 className="text-sm font-semibold text-foreground">Tracklist</h3>
                              {trackListStats && (
                                <span ref={trackStatsRef} className="text-sm tabular-nums text-muted-foreground">{trackListStats}</span>
                              )}
                            </div>
                            <TrackList
                              items={postData.tracks!}
                              albumArtist={metadata.artist}
                              className="!border-0 !bg-transparent !shadow-none"
                              sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                            />
                          </div>
                        )}
                        <PostFoot
                          signUp={showSignupCTA ? handleSignupClick : undefined}
                          addToProfile={showAddToProfile ? addToProfileAction : undefined}
                          onReport={openReport}
                        />
                      </div>
                    </div>
                  </div>
                  {ownerColumnBeside && (
                    <PostStudioColumn
                      {...ownerColumnProps}
                      ref={centerOnPostCard}
                      className="sticky top-[var(--post-toolbar-clearance)] w-auto motion-safe:data-[recentered]:transition-[margin-top] motion-safe:data-[recentered]:duration-300 motion-safe:data-[recentered]:ease-out-quart"
                    />
                  )}
                </div>
              </div>
            </div>
        ) : (
          <div className="px-4 sm:px-6 md:px-8 pb-2 sm:pb-8 pt-16 max-w-lg mx-auto">
            <section className="flex flex-col min-h-[calc(100svh-6.5rem)]">
            <div className="pt-2.5 pb-2 sm:pt-4 sm:pb-4 w-full shrink-0">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="justify-self-start">
                  <BackButton route={backRoute} fallbackRoute="/explore" />
                </div>
                <PostShareMenu
                  isTeamAccount={isTeamAccount}
                  copyState={copyState}
                  onPlainShare={handleShare}
                  onTemplateCopy={handleAttributedCopy}
                />
                <div className="justify-self-end">
                  {isOwnPost ? (
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Post actions"
                            data-testid="post-actions-trigger"
                            className="rounded-full"
                          >
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ownerMenuItems}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="text-center flex flex-col flex-1 gap-1.5 sm:gap-6">
              {/* Album Art — fixed by width so browser height changes cannot resize it. */}
              <div className="flex flex-1 items-center justify-center">
                <div className="relative rounded-md bg-card p-2 elev-3 ring-1 ring-foreground/10">
                  <ArtworkImage
                    src={imageError || !metadata.artwork ? '/images/cassette_logo.svg' : metadata.artwork}
                    alt={metadata.title}
                    width={340}
                    height={340}
                    sizes="(max-width: 639px) 260px, 340px"
                    className="block h-[260px] w-[260px] rounded-sm object-cover sm:h-[340px] sm:w-[340px]"
                    priority
                    decoding="sync"
                    onError={() => setImageError(true)}
                    unoptimized={!imageError && !!metadata.artwork}
                  />

                  {isTrack && postData?.previewUrl && (
                    <div className="absolute -bottom-4 -right-2">
                      <PlayPreview
                        previewUrl={postData.previewUrl}
                        title={metadata.title}
                        artist={metadata.artist}
                        artwork={metadata.artwork}
                        mobile={true}
                        postId={postData?.postId || postId}
                        elementType="track"
                        sourcePlatform={sourcePlatformKey === 'appleMusic' ? 'apple' : sourcePlatformKey ?? 'unknown'}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="card-ink overflow-hidden">
                <PostLabelHead
                  compact
                  kicker={labelKicker}
                  title={metadata.title}
                  artist={isTrack || isAlbum ? artistLine : undefined}
                  meta={labelMeta}
                  tint={labelTint}
                />
                <div className="px-3 pb-3 pt-9 sm:px-5 sm:pb-5">
                  {listenSection}
                </div>
              </div>

              {postData?.username && hasPostOwner && (
                <div className="px-3 py-2.5 sm:p-4 card-ink flex flex-col gap-1.5 sm:gap-2.5 text-left relative z-20">
                  <PostAuthorHeader
                    username={postData.username}
                    description={postData?.description || ''}
                    createdAt={postData?.createdAt}
                  />
                  <PostEngagementBar
                    likeCount={postData?.likeCount ?? 0}
                    likedByCurrentUser={Boolean(postData?.likedByCurrentUser)}
                    isLikePending={isLikePending}
                    onToggleLike={handleToggleLike}
                    canRepost={canRepost}
                    hasReposted={hasReposted}
                    isRepostPending={isRepostPending}
                    onRepost={() => void handleRepost()}
                    commentCount={commentCount}
                    commentsEnabled={postData?.commentsEnabled ?? true}
                    onOpenComments={handleOpenComments}
                    canManage={isOwnPost}
                    privacy={studioPrivacy}
                    onOpenStudio={handleOpenStudio}
                    className="self-start"
                  />
                </div>
              )}
            </div>
            </section>

            <div className="mt-2 sm:mt-6 text-center space-y-2 sm:space-y-6">
              {showTracks && (
                <div className="card-ink overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Tracklist</h3>
                    {trackListStats && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {trackListStats}
                      </span>
                    )}
                  </div>
                  <TrackList
                    items={postData.tracks!}
                    albumArtist={metadata.artist}
                    compact
                    className="!border-0 !bg-transparent !shadow-none"
                    sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                  />
                </div>
              )}

              <PostFoot
                signUp={showSignupCTA ? handleSignupClick : undefined}
                addToProfile={showAddToProfile ? addToProfileAction : undefined}
                onReport={openReport}
              />
            </div>
          </div>
        )}
      </div>
      </PostContextMenu>

      {/* Edit Modal - always render to allow Radix UI animations */}
      <EditPostModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        postId={postId}
        currentDescription={postData?.description || ''}
        currentPrivacy={(postData?.privacy as 'public' | 'private' | 'subscriber' | undefined) ?? 'public'}
        currentCommentsEnabled={postData?.commentsEnabled ?? true}
        playlistLinksEditable={isPlaylist && !postData?.isRepost}
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

      {postData?.username && hasPostOwner && (
        <PostCommentsSheet
          open={commentsSheetOpen}
          onOpenChange={setCommentsSheetOpen}
          postId={postData?.postId || postId}
          commentsEnabled={postData?.commentsEnabled ?? true}
          currentUserId={user?.id}
          currentUsername={user?.username}
          onCountChange={setCommentCount}
        />
      )}

      {isOwnPost && (
        <PostStudioSheet
          key={postData?.postId || postId}
          open={studioPanelOpen}
          onOpenChange={setStudioPanelOpen}
          postId={ownerColumnProps.postId}
          privacy={ownerColumnProps.privacy}
          onPrivacyChange={ownerColumnProps.onPrivacyChange}
          conversionSuccessCount={ownerColumnProps.conversionSuccessCount}
        />
      )}

    </div>
  );
}
