'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, useEffect, useState, Suspense, useCallback } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { ConversionProgress } from '@/components/features/conversion/conversion-progress';
import { StreamingLinks } from '@/components/features/entity/streaming-links';
import { PlaylistStreamingLinks } from '@/components/features/entity/playlist-streaming-links';
import { PlayPreview } from '@/components/features/entity/play-preview';
import { TrackList } from '@/components/features/entity/track-list';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedColorBackground } from '@/components/ui/animated-color-background';
import { ColorExtractor } from '@/services/color-extractor';
import { MainContainer } from '@/components/ui/container';
import { HeadlineText, BodyText, UIText } from '@/components/ui/typography';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { HeartHandshake } from 'lucide-react';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';
import { detectContentType } from '@/utils/content-type-detection';

// Incoming track shape when using ?data= payloads
type IncomingDataTrack = {
  trackNumber?: number;
  title?: string;
  duration?: string;
  artist?: string;
  artists?: string[];
  previewUrl?: string | null;
};

type JoinCassetteCTAProps = {
  onClick: () => void;
  className?: string;
};

function JoinCassetteCTA({ onClick, className }: JoinCassetteCTAProps) {
  return (
    <div className={`rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center backdrop-blur-sm ${className ?? ''}`}>
      <h3 className="text-lg font-semibold text-foreground">Create your free Cassette account</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Save your conversions, build collections, and share music with friends once you sign up.
      </p>
      <div className="mt-5 flex justify-center">
        <AnimatedButton
          text="Create free account"
          onClick={onClick}
          height={48}
          width={230}
          initialPos={6}
          textStyle="text-base font-bold tracking-wide font-atkinson"
        />
      </div>
    </div>
  );
}

function PostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthState();
  const [postData, setPostData] = useState<MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; genres?: string[]; albumName?: string; releaseDate?: string | null; trackCount?: number; details?: { artists?: Array<{ name: string; role: string; }>; }; musicElementId?: string; sourcePlatform?: string; } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiComplete, setApiComplete] = useState(false);

  // Track when we're fetching an existing post (vs doing a conversion)
  const [isFetchingExistingPost, setIsFetchingExistingPost] = useState(false);

  // Demo mode - force loading state for testing
  const [demoMode, setDemoMode] = useState(false);
  
  // Animation states
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const handleSignupClick = () => router.push('/auth/signup');
  const postIdParam = searchParams.get('id');
  const [, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const buildShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    if (postData?.postId) return `${window.location.origin}/post?id=${postData.postId}`;
    if (postIdParam) return `${window.location.origin}/post?id=${postIdParam}`;
    return window.location.href;
  }, [postData?.postId, postIdParam]);

  const handleCopyShareLink = useCallback(async () => {
    const shareUrl = buildShareUrl();
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy conversion link:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [buildShareUrl]);
  
  // Determine if this is from add-music page based on URL params
  const isFromAddMusic = searchParams.get('fromAddMusic') === 'true';
  
  // Use the conversion mutation - anonymous for home page, authenticated for add-music
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion({
    anonymous: !isFromAddMusic
  });
  
  // Guards against duplicate conversions (React Strict Mode protection)
  const hasConvertedRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const sourcePlatformRef = useRef<string | null>(null);
  
  useEffect(() => {
    const run = async () => {
      try {
        const urlParam = searchParams.get('url');
        const dataParam = searchParams.get('data');
        const postId = searchParams.get('id');
        const demo = searchParams.get('demo');

        // Check for demo mode - only activate if explicitly requested
        if (demo === 'loading') {
          console.log('🎬 Demo mode activated - showing pulse loader');
          setDemoMode(true);
          return;
        }

        // If no parameters at all, immediately set error
        if (!urlParam && !dataParam && !postId) {
          console.log('❌ No parameters provided - setting error immediately');
          setError('No data provided');
          return;
        }

        // Only run conversion when we actually have a ?url=
        if (urlParam) {
          const decodedUrl = decodeURIComponent(urlParam);
          sourceUrlRef.current = decodedUrl;
          sourcePlatformRef.current = detectContentType(decodedUrl).platform;

          // Prevent duplicate mutate calls (Strict Mode / re-renders)
          if (hasConvertedRef.current && lastUrlRef.current === decodedUrl) return;
          hasConvertedRef.current = true;
          lastUrlRef.current = decodedUrl;

          convertLink(decodedUrl, {
            onSuccess: (result) => {
              setApiComplete(true);
              if (result.postId) {
                // replace removes ?url= so this effect won't re-enter conversion
                router.replace(`/post?id=${result.postId}`);
                return;
              }
              console.log('📦 Post page (convert): received result', {
                type: result.metadata?.type,
                trackCount: (result as unknown as { tracks?: unknown[] }).tracks?.length,
              });
              const sourcePlatform = detectContentType(decodedUrl).platform;
              setPostData({ ...result, sourcePlatform, postId: result.postId || postIdParam || undefined });
              if (result.metadata?.artwork) {
                extractColorFromArtwork(result.metadata.artwork);
              }
            },
            onError: (err) => {
              console.error('❌ Post page: Conversion failed:', err);
              setApiComplete(true);
              setError(err instanceof Error ? err.message : 'Failed to convert link');
            },
          });
          return; // important: don't fall through
        }

        if (dataParam) {
          const parsedData = JSON.parse(decodeURIComponent(dataParam));

          // Transform arbitrary JSON payload (e.g. playlist JSON) into our internal shape
          // Expected fields in parsedData (best-effort):
          // - name, description, imageUrl, numberOfTracks, elementType, tracks[], platforms{}
          const transformedFromData: MusicLinkConversion & {
            description?: string;
            username?: string;
            genres?: string[];
            albumName?: string;
            releaseDate?: string | null;
            trackCount?: number;
            sourcePlatform?: string;
          } = {
            originalUrl: (
              parsedData.originalUrl ||
              parsedData.sourceUrl ||
              parsedData.platforms?.spotify?.url ||
              parsedData.platforms?.applemusic?.url ||
              parsedData.platforms?.appleMusic?.url ||
              parsedData.platforms?.deezer?.url ||
              ''
            ),
            convertedUrls: {},
            metadata: {
              type:
                (typeof parsedData.elementType === 'string' && parsedData.elementType.toLowerCase() === 'track')
                  ? ElementType.TRACK
                  : (typeof parsedData.elementType === 'string' && parsedData.elementType.toLowerCase() === 'album')
                  ? ElementType.ALBUM
                  : (typeof parsedData.elementType === 'string' && parsedData.elementType.toLowerCase() === 'artist')
                  ? ElementType.ARTIST
                  : ElementType.PLAYLIST,
              title: parsedData.title || parsedData.name || 'Untitled',
              artist: parsedData.artist || '',
              artwork: parsedData.metadata?.artwork || parsedData.imageUrl || parsedData.details?.coverArtUrl || '',
              duration: parsedData.metadata?.duration || parsedData.details?.duration || undefined,
            },
            description: parsedData.description || undefined,
            username: parsedData.username || undefined,
            trackCount: parsedData.numberOfTracks || parsedData.details?.trackCount || undefined,
          };

          // Map platform URLs if present
          if (parsedData.platforms && typeof parsedData.platforms === 'object') {
            Object.entries(parsedData.platforms as Record<string, { url?: string } | undefined>).forEach(([platform, data]) => {
              if (!data?.url) return;
              let platformKey = platform.toLowerCase();
              if (platformKey === 'applemusic') platformKey = 'appleMusic';
              // Only map known keys
              if (['spotify', 'applemusic', 'appleMusic', 'deezer'].includes(platform)) {
                (transformedFromData.convertedUrls as Record<string, string>)[platformKey] = data.url;
              }
            });
          }

          // Map tracks to MediaListTrack[] when available
          if (Array.isArray(parsedData.tracks)) {
            // Map arbitrary incoming tracks to our MediaListTrack
            const mappedTracks: MediaListTrack[] = parsedData.tracks.map((t: IncomingDataTrack, idx: number) => ({
              trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : idx + 1,
              title: t.title || 'Untitled',
              duration: t.duration || undefined,
              artists: t.artist ? [t.artist] : Array.isArray(t.artists) ? t.artists : undefined,
              previewUrl: t.previewUrl || undefined,
            }));
            transformedFromData.tracks = mappedTracks;
          }

          // If artwork available, kick off color extraction
          if (transformedFromData.metadata.artwork) {
            extractColorFromArtwork(transformedFromData.metadata.artwork);
          }

          console.log('📦 Post page (?data): transformed payload', {
            type: transformedFromData.metadata.type,
            trackCount: transformedFromData.tracks?.length || 0,
            hasTracksArray: Array.isArray(transformedFromData.tracks),
          });
          const detectedSourcePlatform = detectContentType(transformedFromData.originalUrl || '').platform;
          sourceUrlRef.current = transformedFromData.originalUrl || sourceUrlRef.current;
          sourcePlatformRef.current = detectedSourcePlatform || sourcePlatformRef.current;
          setPostData({
            ...transformedFromData,
            sourcePlatform: detectedSourcePlatform,
            postId: postIdParam || transformedFromData.postId,
          });
          setApiComplete(true);
          return;
        }

        if (postId) {
          setIsFetchingExistingPost(true);
          const response = await apiService.fetchPostById(postId);
          
          // Transform the API response (support both detailed and simplified shapes)
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
              response.platforms?.spotify?.url ||
              response.platforms?.applemusic?.url ||
              response.platforms?.appleMusic?.url ||
              response.platforms?.deezer?.url ||
              '';
            const transformedData: MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; genres?: string[]; albumName?: string; releaseDate?: string | null; trackCount?: number; details?: { artists?: Array<{ name: string; role: string; }>; }; musicElementId?: string; sourcePlatform?: string; } = {
              originalUrl: originalLink,
              convertedUrls: {},
              metadata: {
                type: typeVal,
                title: titleVal,
                artist: artistVal,
                artwork: artworkVal,
                duration: durationVal,
              },
              description: response.caption,
              username: response.username,
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
            console.log('originalUrl', transformedData.originalUrl);
            console.log('convertedUrls', transformedData.convertedUrls);

            // Map album/playlist track data when available for album/playlist view
            type ApiAlbumTrack = {
              title?: string;
              duration?: string;
              trackNumber?: number;
              artists?: string[];
              previewUrl?: string;
            };

            const trackArray = (response.details as { tracks?: ApiAlbumTrack[] } | undefined)?.tracks;
            if (Array.isArray(trackArray) && trackArray.length > 0) {
              const mapped: MediaListTrack[] = trackArray.map((t) => ({
                trackNumber: t.trackNumber,
                title: t.title ?? 'Untitled',
                duration: t.duration,
                artists: Array.isArray(t.artists) ? t.artists : undefined,
                previewUrl: t.previewUrl,
              }));
              transformedData.tracks = mapped;
            }

            // Fallback: some responses provide tracks at the top level (playlist cases)
            type ApiTopLevelTrack = {
              title?: string;
              duration?: string;
              artist?: string;
              artists?: string[];
              previewUrl?: string | null;
              trackNumber?: number;
            };
            const topLevelTracks = (response as unknown as { tracks?: ApiTopLevelTrack[] }).tracks;
            if ((!transformedData.tracks || transformedData.tracks.length === 0) && Array.isArray(topLevelTracks) && topLevelTracks.length > 0) {
              const mappedTop: MediaListTrack[] = topLevelTracks.map((t, idx) => ({
                trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : idx + 1,
                title: t.title ?? 'Untitled',
                duration: t.duration,
                artists: t.artist ? [t.artist] : Array.isArray(t.artists) ? t.artists : undefined,
                previewUrl: t.previewUrl ?? undefined,
              }));
              transformedData.tracks = mappedTop;
            }
            
            // Extract platform URLs and artwork - handle different platform key formats
            let fallbackArtwork = '';
            if (response.platforms) {
              Object.entries(response.platforms).forEach(([platform, data]) => {
                // Check if URL exists and is not empty
                if (data?.url && data.url.trim() !== '') {
                  // Map platform keys to match the expected convertedUrls structure
                  let platformKey = platform.toLowerCase();
                  if (platformKey === 'applemusic') {
                    platformKey = 'appleMusic';
                  }
                  transformedData.convertedUrls[platformKey as keyof typeof transformedData.convertedUrls] = data.url;
                }
                
                // Collect artwork URLs as fallback
                if (data?.artworkUrl && !fallbackArtwork) {
                  fallbackArtwork = data.artworkUrl;
                }
              });
              
              // Extract preview URL - prioritize main details.previewUrl, then check platforms
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
            
              console.log('📦 Post page: transformed post data', {
                type: transformedData.metadata.type,
                trackCount: (transformedData as unknown as { tracks?: unknown[] }).tracks?.length,
              });
              const detectedSourcePlatform = detectContentType(originalLink || '').platform;
              sourceUrlRef.current = originalLink || sourceUrlRef.current;
              sourcePlatformRef.current = detectedSourcePlatform || sourcePlatformRef.current;
              setPostData({
                ...transformedData,
                sourcePlatform: detectedSourcePlatform,
                postId: response.postId || postIdParam || transformedData.postId,
              });
            setApiComplete(true);
            
            // Extract dominant color
            if (transformedData.metadata.artwork) {
              extractColorFromArtwork(transformedData.metadata.artwork);
            }
          } else {
            throw new Error('Invalid response format');
          }
          return;
        }
      } catch (e) {
        console.error('Error loading post data:', e);
        setApiComplete(true);
        setError('Failed to load content');
      }
    };

    run();
    // Only depend on searchParams; do NOT depend on convertLink/router to avoid spurious reruns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Color extraction function
  const extractColorFromArtwork = async (artworkUrl: string) => {
    try {
      const result = await ColorExtractor.extractDominantColor(artworkUrl);
      setDominantColor(result.dominantColor);
    } catch (error) {
      console.error('❌ Color extraction failed:', error);
      setDominantColor('#3B82F6'); // Fallback to blue
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
  
  // Log post render state (must be before any early returns to satisfy hooks rules)
  useEffect(() => {
    if (postData) {
      console.log('🧩 Post render state:', {
        type: (postData as MusicLinkConversion).metadata.type,
        hasTracks: Array.isArray((postData as MusicLinkConversion).tracks),
        trackCount: (postData as MusicLinkConversion).tracks?.length || 0,
      });
    }
  }, [postData]);
  
  // Show skeleton for existing post fetch (not a conversion)
  if (isFetchingExistingPost && !postData && !error) {
    return <EntitySkeleton isDesktop={isDesktop} />;
  }

  // Show conversion progress while converting, or in demo mode
  if (isConverting || (!postData && !error && !isFetchingExistingPost) || demoMode) {
    console.log('🌊 Showing conversion progress:', { isConverting, hasPostData: !!postData, hasError: !!error, demoMode });

    const urlParam = searchParams.get('url');
    const currentUrl = urlParam ? decodeURIComponent(urlParam) : '';

    return (
      <ConversionProgress
        url={currentUrl}
        metadata={null}
        apiComplete={apiComplete}
        onComplete={() => {
          // Conversion simulation complete - the actual API call should also be done by now
          console.log('🎉 Conversion progress simulation completed');
        }}
        onCancel={() => {
          router.back();
        }}
        isDesktop={isDesktop}
      />
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen relative">
        <AnimatedColorBackground color={dominantColor} />
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
            <AnimatedButton
              text="Go Back"
              onClick={() => router.back()}
              height={40}
              width={120}
              initialPos={4}
            />
          </MainContainer>
        </div>
      </div>
    );
  }
  console.log('postData', postData);
  
  const { metadata, convertedUrls } = postData as MusicLinkConversion;
  console.log('convertedUrls', convertedUrls);
  // Derive clear flags for how to render the page based on content type
  const detectedTypeFromUrl = detectContentType(postData?.originalUrl || sourceUrlRef.current || '').type;
  const isTrack = metadata.type === ElementType.TRACK; // only true for tracks
  const isAlbum = metadata.type === ElementType.ALBUM; // album-specific layout bits
  const isArtist = metadata.type === ElementType.ARTIST; // artist profile-like layout
  const isPlaylist = metadata.type === ElementType.PLAYLIST || detectedTypeFromUrl === 'playlist'; // playlist-specific layout bits
  const typeLabel = isTrack ? 'Track' : isAlbum ? 'Album' : isArtist ? 'Artist' : 'Playlist';
  const showTracks = (isAlbum || isPlaylist) && Array.isArray(postData?.tracks) && (postData.tracks?.length ?? 0) > 0;
  const useSplitScrollLayout = isDesktop && (isAlbum || isPlaylist);
  const showSignupCTA = !isLoading && !isAuthenticated;
  
  
  return (
    <div className={useSplitScrollLayout ? "fixed inset-x-0 top-16 bottom-0 overflow-y-auto" : "min-h-screen relative"}>
      {/* Animated Gradient Background */}
      <AnimatedColorBackground color={dominantColor} />
      
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
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center justify-center p-2 rounded-full text-foreground hover:opacity-70 transition-opacity"
                    onClick={handleCopyShareLink}
                    aria-label="Share conversion link"
                  >
                    <Image
                      src="/images/ic_share.png"
                      alt="Share"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
            {/* Content Row */}
            <div className="flex gap-8 flex-1 min-h-0">
              {/* Left: fixed panel */}
              <div className="flex-[2] sticky top-0 h-full">
                {/* Make the left column fill the available height and center content vertically */}
                <div className="h-full flex flex-col items-center justify-center min-w-0">
                  <UIText className="text-foreground font-bold mb-8 uppercase tracking-wider text-lg">
                    {typeLabel}
                  </UIText>
                  {/* Artwork */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                    <Image
                      src={metadata.artwork || '/images/cassette_logo.png'}
                      alt={metadata.title}
                      width={340}
                      height={340}
                      className="relative rounded-xl object-cover shadow-xl"
                      priority
                      onError={(e) => {
                        console.error('❌ Desktop image failed to load:', metadata.artwork);
                        e.currentTarget.src = '/images/cassette_logo.png';
                      }}
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
                    <div className="p-8 bg-card/30 rounded-xl border border-border/40 backdrop-blur-md shadow-lg w-full max-w-xl">
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
                            {postData?.description && (
                              <div className="w-full text-center mb-2">
                                <BodyText className="text-muted-foreground italic">{postData.description}</BodyText>
                              </div>
                            )}
                            {typeof postData?.trackCount === 'number' && (
                              <div>
                                <span className="text-muted-foreground">Tracks: </span>
                                <span className="font-medium">{postData.trackCount}</span>
                              </div>
                            )}
                            {Array.isArray(postData?.tracks) && postData.tracks.length > 0 && !postData?.trackCount && (
                              <div>
                                <span className="text-muted-foreground">Tracks: </span>
                                <span className="font-medium">{postData.tracks.length}</span>
                              </div>
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
                  {/* Streaming Links (moved from right) */}
                  {(isAlbum || isPlaylist) && (
                    <div className="mt-6 p-8 bg-card/40 rounded-2xl border border-border/40 shadow-lg backdrop-blur-md relative z-10 w-full max-w-xl">
                      <h3 className="text-xl font-semibold text-card-foreground mb-6 text-center">Listen Now</h3>
                        {isPlaylist ? (
                          <PlaylistStreamingLinks
                            links={convertedUrls}
                            className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                            playlistId={postData?.musicElementId || ''}
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
                  {showSignupCTA && (
                    <JoinCassetteCTA
                      onClick={handleSignupClick}
                      className="mt-6 w-full max-w-xl"
                    />
                  )}
                  {/* Report Problem (moved to left to keep right-only track list) */}
                  {(isAlbum || isPlaylist) && (
                    <div className="mt-6 flex justify-center w-full max-w-xl">
                      <button className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-base font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
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
                      <div className="bg-card/25 rounded-xl border border-border/30 overflow-hidden shadow-lg backdrop-blur-md">
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
                  <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center justify-center p-2 rounded-full text-foreground hover:opacity-70 transition-opacity ml-auto"
                    onClick={handleCopyShareLink}
                    aria-label="Share conversion link"
                  >
                    <Image
                      src="/images/ic_share.png"
                      alt="Share"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </button>
                  </div>
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
                          src={metadata.artwork || '/images/cassette_logo.png'}
                          alt={metadata.title}
                          width={360}
                          height={360}
                          className="relative rounded-xl object-cover shadow-lg"
                          priority
                          onError={(e) => {
                            console.error('❌ Desktop image failed to load:', metadata.artwork);
                            e.currentTarget.src = '/images/cassette_logo.png';
                          }}
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
                        <div className="p-5 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
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
                        {/* Description */}
                        {postData?.description && (
                          <div className="p-5 bg-card rounded-lg border border-border shadow-sm">
                            <div className="flex items-start gap-4">
                              <Image
                                src="/images/ic_music.png"
                                alt="User"
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                              <div className="min-w-0 flex-1">
                                <UIText className="font-bold text-card-foreground mb-2">
                                  {postData?.username || 'User'}
                                </UIText>
                                <BodyText className="text-muted-foreground leading-relaxed">
                                  {postData?.description}
                                </BodyText>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Streaming Links */}
                        <div className="p-5 bg-card/50 rounded-2xl border border-border shadow-sm backdrop-blur-sm relative z-10">
                          <h3 className="text-lg font-semibold text-card-foreground mb-4">Listen Now</h3>
                          {isPlaylist ? (
                            <PlaylistStreamingLinks
                              links={convertedUrls}
                              className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                              playlistId={postData?.musicElementId || ''}
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
                        {showSignupCTA && (
                          <JoinCassetteCTA onClick={handleSignupClick} />
                        )}
                        {/* Support Us */}
                        <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3 text-left">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                                <HeartHandshake className="h-5 w-5" />
                              </span>
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">Enjoying Cassette?</h3>
                                <p className="text-sm text-muted-foreground">
                                  Help us keep building friendly music tools by tipping the team on Ko-fi.
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={openKoFiSupport}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Support Cassette on Ko-fi"
                            >
                              <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={18} height={18} className="rounded-full" />
                              <span>Support Us</span>
                            </button>
                          </div>
                        </div>

                        {/* Report Problem */}
                        <div className="flex justify-center">
                          <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
          // Mobile Layout - matching Flutter body() with proper container structure
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
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center justify-center p-2 rounded-full text-foreground hover:opacity-70 transition-opacity ml-auto"
                    onClick={handleCopyShareLink}
                    aria-label="Share conversion link"
                  >
                    <Image
                      src="/images/ic_share.png"
                      alt="Share"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center space-y-6">
              {/* Element Type */}
              <div>
                <UIText className="text-foreground font-bold mb-8 uppercase tracking-wider text-lg">
                  {typeLabel}
                </UIText>
              </div>
              
              {/* Album Art Container */}
              <div>
                {/* Album Art with Shadow - matching Flutter styling with responsive sizing */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                  <Image
                    src={metadata.artwork || '/images/cassette_logo.png'}
                    alt={metadata.title}
                    width={0}
                    height={0}
                    sizes="(max-width: 640px) 280px, 320px"
                    className="relative rounded-xl object-cover shadow-lg w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]"
                    priority
                    onError={(e) => {
                      console.error('❌ Mobile image failed to load:', metadata.artwork);
                      e.currentTarget.src = '/images/cassette_logo.png';
                    }}
                  />
                  
                  {/* Play Preview for Tracks only - positioned over artwork */}
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
              <div className="p-6 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
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
                      {postData?.description && (
                        <div className="text-center">
                          <BodyText className="text-muted-foreground italic">{postData.description}</BodyText>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-center gap-3">
                        {typeof postData?.trackCount === 'number' && (
                          <div>
                            <span className="text-muted-foreground">Tracks: </span>
                            <span className="font-medium">{postData.trackCount}</span>
                          </div>
                        )}
                        {Array.isArray(postData?.tracks) && postData.tracks.length > 0 && !postData?.trackCount && (
                          <div>
                            <span className="text-muted-foreground">Tracks: </span>
                            <span className="font-medium">{postData.tracks.length}</span>
                          </div>
                        )}
                      </div>
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
                <div className="bg-card/25 rounded-xl border border-border/30 overflow-hidden shadow-lg backdrop-blur-md">
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
                  />
                </div>
              )}
              
              {/* Description if available for non-playlists - matching Flutter styling */}
              {postData?.description && !isPlaylist && (
                <div className="p-5 bg-card/40 rounded-xl border border-border/50 text-left backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <Image
                      src="/images/ic_music.png"
                      alt="User"
                      width={32}
                      height={32}
                      className="rounded-full flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <UIText className="font-bold text-foreground text-base mb-2">
                        {postData?.username || 'User'}
                      </UIText>
                      <BodyText className="text-muted-foreground text-base break-words leading-relaxed">
                        {postData?.description}
                      </BodyText>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Streaming Links Container - matching desktop glass effect */}
              <div className="p-6 bg-card/50 rounded-2xl border border-border/30 shadow-sm backdrop-blur-sm relative z-10">
                <h3 className="text-lg font-semibold text-card-foreground mb-4 text-center">Listen Now</h3>
                {isPlaylist ? (
                  <PlaylistStreamingLinks
                    links={convertedUrls}
                    className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                    playlistId={postData?.musicElementId || ''}
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
              {showSignupCTA && (
                <JoinCassetteCTA onClick={handleSignupClick} />
              )}
              
              {/* Support Us */}
              <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm text-left">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <HeartHandshake className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Enjoying Cassette?</h3>
                      <p className="text-sm text-muted-foreground">
                        Tip the team on Ko-fi and help us keep the music sharing going.
                      </p>
                    </div>
                  </div>
              <button
                onClick={openKoFiSupport}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Support Cassette on Ko-fi"
              >
                <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={18} height={18} className="rounded-full" />
                <span>Support Us</span>
              </button>
                </div>
              </div>

              {/* Report Problem Button */}
              <div>
                <button className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors font-medium relative z-50">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Report a Problem</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<EntitySkeleton isDesktop={false} />}>
      <PostPageContent />
    </Suspense>
  );
}
