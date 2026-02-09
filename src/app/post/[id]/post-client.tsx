'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { StreamingLinks, streamingServices } from '@/components/features/entity/streaming-links';
import { PlaylistStreamingLinks } from '@/components/features/entity/playlist-streaming-links';
import { PlayPreview } from '@/components/features/entity/play-preview';
import { TrackList } from '@/components/features/entity/track-list';
import { PostDescriptionCard } from '@/components/features/post/post-description-card';
import { EditPostModal } from '@/components/features/post/edit-post-modal';
import { DeletePostModal } from '@/components/features/post/delete-post-modal';
import { ReportIssueModal } from '@/components/features/report-issue-modal';
import { Button } from '@/components/ui/button';
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
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { useAddMusicToProfile } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { AlertCircle, Check, Copy, ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';
import { detectContentType } from '@/utils/content-type-detection';

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
        className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-primary text-white border-2 border-white dark:border-black"
      >
        Sign up free
      </button>
    </div>
  );
}

interface PostClientPageProps {
  postId: string;
}

export default function PostClientPage({ postId }: PostClientPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthState();
  const { mutate: addToProfile, isPending: isAddingToProfile } = useAddMusicToProfile();
  const [addStatus, setAddStatus] = useState<'idle' | 'added' | 'error'>('idle');
  const [postData, setPostData] = useState<MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; createdAt?: string; genres?: string[]; albumName?: string; releaseDate?: string | null; trackCount?: number; details?: { artists?: Array<{ name: string; role: string; }>; }; musicElementId?: string; sourcePlatform?: string; privacy?: string; } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation states
  const [palette, setPalette] = useState<ColorPalette | null>(null);
  const handleSignupClick = () => router.push('/auth/signup');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [imageError, setImageError] = useState(false);

  // Edit/Delete modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Handle delete success - redirect to profile
  const handleDeleteSuccess = useCallback(() => {
    if (postData?.username) {
      router.push(`/profile/${postData.username}`);
    } else {
      router.push('/');
    }
  }, [router, postData?.username]);

  // Handle edit success - update local state with new description
  const handleEditSuccess = useCallback((updated: { description: string; privacy: string }) => {
    setPostData((prev) =>
      prev ? { ...prev, description: updated.description, privacy: updated.privacy } : prev
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
  }, [buildShareUrl, postData?.metadata?.title, postData?.metadata?.artist]);

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
      { musicElementId, elementType, description: postData?.description },
      {
        onSuccess: () => setAddStatus('added'),
        onError: (error) => {
          console.error('❌ Add to profile failed:', error);
          setAddStatus('error');
          setTimeout(() => setAddStatus('idle'), 3000);
        },
      },
    );
  }, [addToProfile, postData?.musicElementId, postData?.metadata?.type, postData?.description]);

  const isOwnPost =
    !!postData?.username &&
    !!user?.username &&
    postData.username.toLowerCase() === user.username.toLowerCase();
  const showAddToProfile = isAuthenticated && !isOwnPost;

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await apiService.fetchPostById(postId);

        if (response.success) {
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
          const transformedData: MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; createdAt?: string; genres?: string[]; albumName?: string; releaseDate?: string | null; trackCount?: number; details?: { artists?: Array<{ name: string; role: string; }>; }; musicElementId?: string; sourcePlatform?: string; privacy?: string; } = {
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
            username: response.username,
            createdAt: response.createdAt,
            privacy: response.privacy,
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

          // Extract platform URLs and artwork
          let fallbackArtwork = '';
          if (response.platforms) {
            Object.entries(response.platforms).forEach(([platform, data]) => {
              if (data?.url && data.url.trim() !== '') {
                let platformKey = platform.toLowerCase();
                if (platformKey === 'applemusic') {
                  platformKey = 'appleMusic';
                }
                transformedData.convertedUrls[platformKey as keyof typeof transformedData.convertedUrls] = data.url;
              }

              if (data?.artworkUrl && !fallbackArtwork) {
                fallbackArtwork = data.artworkUrl;
              }
            });

            // Extract preview URL
            transformedData.previewUrl = response.details?.previewUrl ||
                                       response.platforms?.spotify?.previewUrl ||
                                       response.platforms?.deezer?.previewUrl ||
                                       response.platforms?.applemusic?.previewUrl ||
                                       response.platforms?.appleMusic?.previewUrl;
          }

          // Use fallback artwork if main artwork is empty
          if (!transformedData.metadata.artwork && fallbackArtwork) {
            transformedData.metadata.artwork = fallbackArtwork;
          }

          const detectedSourcePlatform = detectContentType(originalLink || '').platform;
          sourceUrlRef.current = originalLink || sourceUrlRef.current;
          sourcePlatformRef.current = detectedSourcePlatform || sourcePlatformRef.current;
          setPostData({
            ...transformedData,
            sourcePlatform: detectedSourcePlatform,
            postId: response.postId || postId || transformedData.postId,
          });

          // Extract dominant color
          if (transformedData.metadata.artwork) {
            extractColorFromArtwork(transformedData.metadata.artwork);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (e) {
        console.error('Error loading post data:', e);
        setError('Failed to load content');
      }
    };

    fetchPost();
  }, [postId]);

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

  if (error) {
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
            <Button
              onClick={() => router.back()}
              className="h-10 px-6"
            >
              Go Back
            </Button>
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
  const playlistTrackCount = Array.isArray(postData?.tracks) && postData.tracks.length > 0
    ? postData.tracks.length
    : typeof postData?.trackCount === 'number'
      ? postData.trackCount
      : undefined;
  const useSplitScrollLayout = isDesktop && (isAlbum || isPlaylist);
  const showSignupCTA = !isLoading && !isAuthenticated;

  // Source platform detection for playlist attribution badge
  const normalizePlatformKey = (platform?: string | null): 'spotify' | 'appleMusic' | 'deezer' | null => {
    if (!platform) return null;
    const lowered = platform.toLowerCase();
    if (lowered === 'spotify') return 'spotify';
    if (lowered === 'deezer') return 'deezer';
    if (lowered === 'applemusic' || lowered === 'apple') return 'appleMusic';
    return null;
  };

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
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
                >
                  <Image
                    src="/images/ic_back.png"
                    alt="Back"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </button>
                <motion.button
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border font-medium text-sm overflow-hidden ${
                    copyState === 'copied'
                      ? 'bg-green-500/20 text-green-600 border-green-500/30'
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
                {/* More Menu (only for own posts) */}
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
                      <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
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
                    <div className="p-8 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg w-full max-w-xl">
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
                      className="mt-6 w-full max-w-xl relative z-20"
                    />
                  )}
                  {/* Streaming Links (moved from right) */}
                  {(isAlbum || isPlaylist) && (
                    <div className="mt-6 p-8 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg relative z-10 w-full max-w-xl">
                      <h3 className="text-xl font-semibold text-card-foreground mb-6 text-center">Listen Now</h3>
                        {isPlaylist ? (
                          <PlaylistStreamingLinks
                            links={convertedUrls}
                            className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                            playlistId={postData?.musicElementId || ''}
                            playlistTrackCount={playlistTrackCount}
                            sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                            sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                          />
                        ) : (
                          <StreamingLinks
                            links={convertedUrls}
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
                        onClick={() => setReportModalOpen(true)}
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
                      <div className="rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 overflow-hidden shadow-lg backdrop-blur-md">
                        <div className="p-5 border-b border-border/30 bg-gradient-to-r from-card/20 to-transparent">
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
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
                  >
                    <Image
                      src="/images/ic_back.png"
                      alt="Back"
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  </button>
                  <motion.button
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border font-medium text-sm overflow-hidden ${
                      copyState === 'copied'
                        ? 'bg-green-500/20 text-green-600 border-green-500/30'
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
                  {/* More Menu (only for own posts) */}
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
                        <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
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
                    </div>
                  </div>
                  {/* Right Column - Content (page scroll) */}
                  <div className="flex-[3]">
                    {/* Vertically center content relative to viewport height */}
                    <div className="py-8 pb-16 min-h-[calc(100vh-140px)] flex flex-col justify-center">
                      <div className="space-y-6">
                        {/* Info Card */}
                        <div className="p-6 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg">
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
                            className="relative z-20"
                          />
                        )}
                        {/* Streaming Links */}
                        <div className="p-6 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg relative z-10">
                          <h3 className="text-lg font-semibold text-card-foreground mb-4">Listen Now</h3>
                          {isPlaylist ? (
                            <PlaylistStreamingLinks
                              links={convertedUrls}
                              className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                              playlistId={postData?.musicElementId || ''}
                              playlistTrackCount={playlistTrackCount}
                              sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                              sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                            />
                          ) : (
                            <StreamingLinks
                              links={convertedUrls}
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
                            onClick={() => setReportModalOpen(true)}
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
          <div className="px-4 sm:px-8 md:px-12 pb-8 mt-16 max-w-lg mx-auto">
            {/* Header Toolbar */}
            <div className="pt-4 pb-6 max-w-7xl mx-auto w-full">
              <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
                  >
                  <Image
                    src="/images/ic_back.png"
                    alt="Back"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </button>
                <motion.button
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border font-medium text-sm overflow-hidden ${
                    copyState === 'copied'
                      ? 'bg-green-500/20 text-green-600 border-green-500/30'
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
                {/* More Menu (only for own posts) */}
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
                      <DropdownMenuItem onClick={() => { setDropdownOpen(false); setEditModalOpen(true); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { setDropdownOpen(false); setDeleteModalOpen(true); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="text-center space-y-6">
              {/* Element Type */}
              <div className="mb-[calc(6rem+env(safe-area-inset-bottom))]">
                <UIText className="text-foreground font-bold mb-8 uppercase tracking-wider text-lg">
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
                    sizes="(max-width: 640px) 280px, 320px"
                    className="relative rounded-xl object-cover shadow-lg w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]"
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
              <div className="p-6 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg">
                <div className="space-y-4">
                  {/* Title */}
                  <HeadlineText className="text-2xl font-bold text-foreground text-center leading-tight">
                    {metadata.title}
                  </HeadlineText>

                  {/* Artists with roles (show for Track/Album) */}
                  {(isTrack || isAlbum) && (
                    <div className="text-center">
                      <BodyText className="text-base text-muted-foreground">
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
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted/30 text-muted-foreground border border-border/50"
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
                <div className="rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 overflow-hidden shadow-lg backdrop-blur-md">
                  <div className="p-4 border-b border-border/30 bg-gradient-to-r from-card/20 to-transparent">
                    <h3 className="text-base font-semibold text-foreground text-center">
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
                  className="text-left relative z-20"
                />
              )}

              {/* Streaming Links Container */}
              <div className="p-6 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg relative z-10">
                <h3 className="text-lg font-semibold text-card-foreground mb-4 text-center">Listen Now</h3>
                {isPlaylist ? (
                  <PlaylistStreamingLinks
                    links={convertedUrls}
                    className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                    playlistId={postData?.musicElementId || ''}
                    playlistTrackCount={playlistTrackCount}
                    sourceUrl={postData?.originalUrl || sourceUrlRef.current || convertedUrls.spotify || convertedUrls.appleMusic || convertedUrls.deezer}
                    sourcePlatform={postData?.sourcePlatform || sourcePlatformRef.current || undefined}
                  />
                ) : (
                  <StreamingLinks
                    links={convertedUrls}
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
                  onClick={() => setReportModalOpen(true)}
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

      {/* Report Issue Modal */}
      <ReportIssueModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        sourceContext="post_view"
        sourceLink={postData?.originalUrl || sourceUrlRef.current || ''}
        conversionData={{
          elementType: metadata.type,
          title: metadata.title,
          artist: metadata.artist,
          platforms: postData?.convertedUrls,
        }}
      />
    </div>
  );
}
