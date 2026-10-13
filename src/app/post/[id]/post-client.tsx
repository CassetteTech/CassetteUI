'use client';

// Renders a public post, enforces viewer-state presentation, and emits sanitized interaction analytics.

import { useRef, useEffect, useState, useCallback, type MouseEvent } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack, InternalSignupLinkTemplate, PostByIdResponse, PostPrivacy, PublicPostPageMetadata } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { StreamingLinks, streamingServices } from '@/components/features/entity/streaming-links';
import { PlaylistStreamingLinks } from '@/components/features/entity/playlist-streaming-links';
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
import { handleStreamingLinkClick } from '@/utils/deep-link';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AnimatedColorBackground } from '@/components/ui/animated-color-background';
import { PostLabelHead, bandTone } from '@/components/features/post/post-label-head';
import { ColorExtractor, ColorPalette } from '@/services/color-extractor';
import { MainContainer } from '@/components/ui/container';
import { HeadlineText, BodyText } from '@/components/ui/typography';
import { ArtworkImage } from '@/components/ui/artwork-image';
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

/** Secondary actions under the post: one primary offer at most, then quiet links. */
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

type PostLoadError = {
  kind: 'unavailable' | 'session' | 'error';
};

type PostPageData = Omit<MusicLinkConversion, 'conversionSuccessCount'> & {
  previewUrl?: string;
  description?: string;
  isRepost?: boolean;
  originalPostId?: string | null;
  redirectPostId?: string;
  paidPromotionCampaignId?: string | null;
  curatorId?: string | null;
  isMemberView?: boolean;
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

export default function PostClientPage({ postId, initialMetadata }: PostClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuthState();
  const isTeamAccount = isCassetteInternalAccount(user?.accountType ?? null);
  const { mutate: addToProfile, isPending: isAddingToProfile } = useAddMusicToProfile();
  const [addStatus, setAddStatus] = useState<'idle' | 'added' | 'error'>('idle');
  const [postData, setPostData] = useState<PostPageData | null>(null);
  // The post came from a conversion handoff, so its staged content was already on screen.
  const [arrivedWarm, setArrivedWarm] = useState(false);
  const [error, setError] = useState<PostLoadError | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

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
  const [commentsSheetOpen, setCommentsSheetOpen] = useState(false);
  const [commentCount, setCommentCount] = useState<number | undefined>(undefined);
  // The owner's tools sit beside the post as a column when the viewport has room;
  // otherwise this sheet carries the same content, opened from the engagement bar.
  const [studioPanelOpen, setStudioPanelOpen] = useState(false);
  const panelSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Roughly matches the sheet's `data-[state=closed]:duration-300` slide-out
  // with a small buffer so the outgoing panel finishes animating before the
  // incoming one starts. Keeps cross-panel swaps visually clean on desktop.
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

  // After a delete, return to the page the post was opened from, such as Studio Music, else the profile.
  const handleDeleteSuccess = useCallback(() => {
    if (backRoute) {
      router.push(backRoute);
    } else if (postData?.username) {
      router.push(`/profile/${postData.username}`);
    } else {
      router.push('/');
    }
  }, [router, backRoute, postData?.username]);

  // Handle edit success - update local state with new description
  const handleEditSuccess = useCallback((changes: PostChanges) => {
    setPostData((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  // Ref to track the source URL for add-to-profile
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

    // Only use Web Share API on mobile/touch devices where it's actually useful
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
      // Desktop: copy to clipboard
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

  // Team-only: copy the post URL tagged with a link template's utm params so the
  // resulting traffic and signups surface in the internal attribution dashboard.
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
  // Bridge reposts only public source posts; an existing repost stays removable.
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

    // Sound on like only; unlike stays silent.
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

  // Fetch post data
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
        // Reset stale error state before each fetch cycle.
        setError(null);

        const startedAt = Date.now();
        // Inline conversion surfaces stash the finished post before
        // navigating here (see lib/post-prefetch) — consume it instead of
        // re-fetching so post-conversion arrivals never see the skeleton.
        // The stash strips server-owned attribution on save and take, so a
        // prefetched payload simply resolves paidPromotionCampaignId to null.
        let response: Awaited<ReturnType<typeof apiService.fetchPostById>> | null =
          takePrefetchedPost(postId);
        if (response) setArrivedWarm(true);

        while (!response && Date.now() - startedAt < maxWaitMs) {
          if (isCancelled) return;
          try {
            const candidate = await apiService.fetchPostById(postId);
            if (candidate?.success) {
              response = candidate;
              break;
            }

            // Some backends return 200 + success=false while a new post is still materializing.
            const payloadRetryAfterMs = (candidate as unknown as { retryAfterMs?: number }).retryAfterMs;
            await sleep(Math.max(100, payloadRetryAfterMs ?? defaultRetryMs));
            continue;
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

        const applyResponse = (payload: PostByIdResponse) => {
          const response = payload;
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
            paidPromotionCampaignId: response.paidPromotionCampaignId ?? null,
            curatorId: response.curatorId ?? null,
            isMemberView: response.isMemberView === true,
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
        };

        if (!response.success) {
          throw new Error('Invalid response format');
        }

        applyResponse(response);

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
  }, [postId, user?.id, isAuthenticated, loadAttempt]);

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

  // Color extraction function
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
  // Room for the owner column beside the desktop layouts; below this the sheet takes over.
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

  // When the window grows into column room while the sheet is open, the column takes
  // over the same content, so the sheet closes instead of doubling it.
  useEffect(() => {
    if (hasColumnRoom) setStudioPanelOpen(false);
  }, [hasColumnRoom]);

  // The comments panel pads the page's right edge (450 ms transition). The owner column
  // stays out of the layout until that padding has shrunk again, or the artwork collapses.
  const [commentsPadded, setCommentsPadded] = useState(false);
  useEffect(() => {
    if (commentsSheetOpen) {
      setCommentsPadded(true);
      return;
    }
    const timeout = setTimeout(() => setCommentsPadded(false), 450);
    return () => clearTimeout(timeout);
  }, [commentsSheetOpen]);

  // The owner column centers on the post card while it is the shorter of the two; a taller
  // column starts at the card's top. While the column stays within the post's height only the
  // column moves; a taller one lengthens the page, which re-centers. The first placement lands
  // before paint; later ones glide (data-recentered turns the transition on).
  const postCardRef = useRef<HTMLDivElement>(null);
  const centerOnPostCard = useCallback((column: HTMLElement | null) => {
    const card = postCardRef.current;
    if (!column || !card) return;
    const observer = new ResizeObserver(() => {
      if (column.style.marginTop) column.dataset.recentered = '';
      column.style.marginTop = `${Math.max(0, (card.offsetHeight - column.offsetHeight) / 2)}px`;
    });
    observer.observe(card);
    observer.observe(column);
    return () => observer.disconnect();
  }, []);

  // The desktop toolbar stays under the navbar on a paper lid once the page scrolls ('raised'),
  // and the lid keeps what scrolls under it. Each value is a function of the scroll position, so
  // scrolling up replays the way down in reverse:
  // - the post's cover and title print on the lid as the h1 goes under it (--title-under, 0 to 1;
  //   'docked' once it is fully under);
  // - the tracklist's stats slide under the lid's edge and stop at its centre line
  //   (--stats-shift), then roll over into "Track NN of N" (--counter-swap) on lists long enough
  //   to collapse, with a fill along the lid's bottom edge (--list-progress);
  // - the tracklist card's bottom edge moves the stats and the fill out again (--list-exit).
  // The values go to CSS variables and the counter's text node, so scrolling renders nothing.
  // Set on the h1, which mounts after the toolbar; the tracklist mounts later and is read per frame.
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
    const unit = (value: number) => Math.min(1, Math.max(0, value));
    const set = (name: string, value: number | string) => toolbar.style.setProperty(name, String(value));
    let frame = 0;
    const update = () => {
      frame = 0;
      const lidBox = lid.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      const titleUnder = unit((lidBox.bottom - titleBox.top) / titleBox.height);
      set('--title-under', titleUnder);
      setToolbarDock(titleUnder === 1 ? 'docked' : window.scrollY > 0 ? 'raised' : undefined);

      const card = trackCardRef.current;
      const stats = trackStatsRef.current;
      const rows = card?.querySelectorAll<HTMLElement>('[data-track-row]');
      if (!card || !stats || !rows?.length) return;
      const statsBox = stats.getBoundingClientRect();
      const offset = (statsBox.top + statsBox.bottom) / 2 - (lidBox.top + lidBox.bottom) / 2;
      const exit = Math.min(0, card.getBoundingClientRect().bottom - lidBox.bottom);
      const counts = rows.length >= EXPANDABLE_MIN_TRACKS;
      // The copy can meet the real stats only where they run under the lid. A visitor's lid ends
      // before Share while the card does not, so there (and with reduced motion) the stats
      // appear in place once they reach the lid's centre line instead of sliding in.
      const slides = !reducedMotion.matches && statsBox.right <= lidBox.right;
      set('--stats-shift', `${slides ? Math.max(0, offset) + exit : exit}px`);
      set('--stats-visible', !slides && offset > 0 ? 0 : 1);
      set('--counter-swap', counts ? unit(-offset / 24) : 0);
      set('--list-exit', `${exit}px`);
      if (!counts) return;
      // A collapsed list clips its later rows; they count only once they are on show.
      const shownBottom = rows[0].parentElement?.parentElement?.getBoundingClientRect().bottom ?? Infinity;
      const passedLine = Math.min(lidBox.bottom, shownBottom);
      let passed = 0;
      while (passed < rows.length && rows[passed].getBoundingClientRect().top < passedLine) passed += 1;
      const listTop = rows[0].getBoundingClientRect().top;
      const listBottom = Math.min(rows[rows.length - 1].getBoundingClientRect().bottom, shownBottom);
      set('--list-progress', unit((lidBox.bottom - listTop) / (listBottom - listTop)));
      if (trackCounterRef.current) {
        const digits = Math.max(2, String(rows.length).length);
        trackCounterRef.current.textContent =
          `Track ${String(Math.max(1, passed)).padStart(digits, '0')} of ${rows.length}`;
      }
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

  // Show skeleton while loading
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

  // The owner column shows only with room beside the desktop layouts; the sheet and its
  // entry points (pill, menu items) exist only when the column does not.
  const showOwnerColumn = isOwnPost && hasColumnRoom;
  // The comments panel takes the right edge, so the column steps out of the layout meanwhile.
  const ownerColumnBeside = showOwnerColumn && !commentsPadded;

  // Owner menu, shared by the three layout branches.
  const ownerMenuItems = (
    <>
      <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
      {/* Opens the owner sheet; absent while the owner column is already beside the post. */}
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
  const trackListDuration = Array.isArray(postData?.tracks) ? formatTrackListDuration(postData.tracks) : null;
  const trackListStats = Array.isArray(postData?.tracks) && postData.tracks.length > 0
    ? formatTrackListStats(postData.tracks)
    : typeof playlistTrackCount === 'number' && playlistTrackCount > 0
      ? `${playlistTrackCount} ${playlistTrackCount === 1 ? 'track' : 'tracks'}`
      : null;

  // Owner column beside the post; both desktop layouts place it after the content.
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
  // The type and genres: the first line of the card label.
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
  const sourceService = sourcePlatformKey ? streamingServices[sourcePlatformKey] : null;

  // Label head content shared by the three card layouts.
  const playlistSource = isPlaylist && sourcePlatformKey && resolvedSourceUrl && sourceService
    ? {
        href: resolvedSourceUrl,
        name: sourceService.name,
        icon: sourceService.icon,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => {
          void captureClientEvent('streaming_link_opened', {
            route: `/post/${postData?.postId || postId}`,
            source_surface: 'post',
            source_platform: sourcePlatformKey === 'appleMusic' ? 'apple' : sourcePlatformKey,
            source_domain: resolvedSourceUrl,
            post_id: postData?.postId || postId,
            element_type: 'playlist',
            is_authenticated: isAuthenticated,
            paid_promotion_campaign_id: postData?.paidPromotionCampaignId ?? undefined,
            curator_id: postData?.curatorId ?? undefined,
            is_member_view: postData?.isMemberView === true,
          });
          handleStreamingLinkClick(event, resolvedSourceUrl);
        },
      }
    : undefined;
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
  const labelMeta = isTrack && (metadata.duration || postData?.albumName)
    ? (
        <>
          {metadata.duration && <span className="tabular-nums">{metadata.duration}</span>}
          {postData?.albumName && <span>{postData.albumName}</span>}
        </>
      )
    : isAlbum && postData?.releaseDate
      ? <span>Released {postData.releaseDate}</span>
      : undefined;

  return (
    <div className="min-h-svh relative">
      {/* Animated Gradient Background */}
      <AnimatedColorBackground palette={palette} />

      {/* Dotted paper texture over the gradient — ties the page to the zine surfaces */}
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
        links={convertedUrls}
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
        // The post lands on its skeleton's outline and settles into focus. A post from a
        // conversion replaces content that was already on screen, so it swaps in place.
        className={`relative z-10 min-h-svh transition-[padding] duration-450 ease-out-quart ${arrivedWarm ? "" : "motion-safe:animate-focus-in"} ${commentsSheetOpen ? "md:pr-[512px]" : ""}`}
      >
        {isDesktop ? (
            // Desktop: one layout for every post type
            // A post shorter than the window (a track or an artist post) centers under the navbar:
            // the two flex-1 pseudo-elements share the free space, and the container's 1rem padding
            // matches the toolbar's above. A taller post starts at the top and scrolls, with the
            // after spacer's 5rem minimum as its bottom space.
            <div className="flex min-h-svh flex-col pt-16 before:flex-1 after:min-h-20 after:flex-1">
              {/* The toolbar and the post share one container, so Back and Share sit on the
                  content's edges. Visitors get a narrower container; the owner column widens it. */}
              <div className={`mx-auto w-full px-8 pb-4 ${ownerColumnBeside ? 'max-w-7xl' : 'max-w-[68rem]'}`}>
                {/* Sticky under the navbar (see followScrollUnderToolbar). The post's half follows the
                    content column below it: a paper lid that keeps what scrolls under it, first the
                    post's cover and title, then the tracklist's stats as a running track counter.
                    Share stays clear of it on the right, above the owner column, which sticks at
                    8.5rem. */}
                <div
                  ref={toolbarRef}
                  data-post-toolbar
                  data-dock={toolbarDock}
                  className={`group sticky top-[4.5rem] z-30 mb-6 mt-4 grid items-center ${ownerColumnBeside ? 'grid-cols-[minmax(0,1fr)_20rem] gap-x-8' : 'grid-cols-[minmax(0,1fr)_auto] gap-x-3'}`}
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
                              <span ref={trackCounterRef} className="font-semibold" style={{ color: bandTone(palette?.vibrant) }} />
                              {trackListDuration && ` · ${trackListDuration}`}
                            </span>
                          </div>
                        </div>
                        <div
                          className="absolute inset-x-0 bottom-0 h-[3px] origin-left opacity-[var(--counter-swap,0)] [transform:translateY(var(--list-exit,0px))_scaleX(var(--list-progress,0))]"
                          style={{ backgroundColor: bandTone(palette?.vibrant) }}
                        />
                      </>
                    )}
                  </div>
                  <div className="relative flex min-w-0 items-center gap-3 transition-[padding] duration-200 ease-out-quart group-data-[dock]:px-3 group-data-[dock]:duration-300 motion-reduce:transition-none">
                    <BackButton route={backRoute} fallbackRoute="/explore" className="shrink-0" />
                    {/* The post, kept: it prints as its h1 goes under the lid and takes the reader
                        back to the top. The h1 stays the accessible title; this is named by its action. */}
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
                  {/* Action cluster: Share is always the rightmost page action,
                      with the owner-only menu at the far edge beside it */}
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
              {/* The post and, for owners, the column beside it, centered on the post card. */}
                <div className={`grid items-start gap-x-8 ${ownerColumnBeside ? 'grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1'}`}>
                  <div className="min-w-0">
                    <div className="w-full">
                      <div className="space-y-6">
                        {/* The post as one object: the sleeve on the left, the label and the listen
                            links on the right. The author row sits at the card's foot. */}
                        <div ref={postCardRef} className="card-ink grid grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] overflow-hidden">
                          {/* The sleeve pane: a tonal step down from the card, the artwork flush to the
                              card's edges, and the person who shared it beneath. */}
                          <div className="flex flex-col bg-muted/40">
                            <div className="relative">
                              <ArtworkImage
                                src={imageError || !metadata.artwork ? '/images/cassette_logo.svg' : metadata.artwork}
                                alt={metadata.title}
                                width={416}
                                height={416}
                                className="block h-auto w-full object-cover"
                                priority
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
                            {/* Who shared it, under the sleeve */}
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
                            source={playlistSource}
                            tint={palette?.vibrant}
                          />
                          <div className="flex flex-1 flex-col justify-center px-6 pb-6 pt-10">
                            <div>
                              <h3 className="sr-only">Listen on</h3>
                              {isPlaylist ? (
                                <PlaylistStreamingLinks
                                  links={convertedUrls}
                                  className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                                  playlistId={postData?.musicElementId || ''}
                                  postId={postData?.postId || postId}
                                  playlistTrackCount={playlistTrackCount}
                                  sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                                  sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                                  paidPromotionCampaignId={postData?.paidPromotionCampaignId}
                                />
                              ) : (
                                <StreamingLinks
                                  links={convertedUrls}
                                  postId={postData?.postId || postId}
                                  elementType={metadata.type}
                                  sourcePlatform={analyticsSourcePlatform}
                                  isAuthenticated={isAuthenticated}
                                  paidPromotionCampaignId={postData?.paidPromotionCampaignId}
                                  curatorId={postData?.curatorId}
                                  isMemberView={postData?.isMemberView}
                                  className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                                />
                              )}
                            </div>
                            {/* Social: author header + engagement bar (moved inside card) */}
                          </div>
                          </div>
                        </div>
                        {/* Album and playlist tracks, in a second card under the post */}
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
                              artwork={metadata.artwork}
                              albumArtist={metadata.artist}
                              variant={isAlbum ? 'album' : 'playlist'}
                              expandable
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
                      className="sticky top-[8.5rem] w-auto motion-safe:data-[recentered]:transition-[margin-top] motion-safe:data-[recentered]:duration-300 motion-safe:data-[recentered]:ease-out-quart"
                    />
                  )}
                </div>
              </div>
            </div>
        ) : (
          // Mobile Layout
          <div className="px-4 sm:px-6 md:px-8 pb-2 sm:pb-8 pt-16 max-w-lg mx-auto">
            {/* First content unit — identical for every post type: toolbar, type
                label, artwork, info card. The tracklist and secondary actions
                follow it. */}
            <section className="flex flex-col min-h-[calc(100svh-6.5rem)]">
            {/* Header Toolbar — 1fr/auto/1fr grid keeps Share centered on the
                screen with Back at the left edge and the owner-only menu at
                the right edge */}
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
                        postId={postData?.postId || postId}
                        elementType="track"
                        sourcePlatform={sourcePlatformKey === 'appleMusic' ? 'apple' : sourcePlatformKey ?? 'unknown'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Track Information Card - Mobile */}
              <div className="card-ink overflow-hidden">
                <PostLabelHead
                  compact
                  kicker={labelKicker}
                  title={metadata.title}
                  artist={isTrack || isAlbum ? artistLine : undefined}
                  meta={labelMeta}
                  source={playlistSource}
                  tint={palette?.vibrant}
                />
                <div className="px-3 pb-3 pt-9 sm:px-5 sm:pb-5">
                  <div>
                    <h3 className="sr-only">Listen on</h3>
                    {isPlaylist ? (
                      <PlaylistStreamingLinks
                        links={convertedUrls}
                        className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                        playlistId={postData?.musicElementId || ''}
                        postId={postData?.postId || postId}
                        playlistTrackCount={playlistTrackCount}
                        sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                        sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                        paidPromotionCampaignId={postData?.paidPromotionCampaignId}
                      />
                    ) : (
                      <StreamingLinks
                        links={convertedUrls}
                        postId={postData?.postId || postId}
                        elementType={metadata.type}
                        sourcePlatform={analyticsSourcePlatform}
                        isAuthenticated={isAuthenticated}
                        paidPromotionCampaignId={postData?.paidPromotionCampaignId}
                        curatorId={postData?.curatorId}
                        isMemberView={postData?.isMemberView}
                        className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Social: author header + engagement bar — part of the fold so
                  attribution is visible without scrolling */}
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

            {/* Below the fold: tracklist and secondary actions */}
            <div className="mt-2 sm:mt-6 text-center space-y-2 sm:space-y-6">
              {/* Track list for album/playlist - mobile */}
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
                    artwork={metadata.artwork}
                    albumArtist={metadata.artist}
                    variant={isAlbum ? 'album' : 'playlist'}
                    compact
                    expandable
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
