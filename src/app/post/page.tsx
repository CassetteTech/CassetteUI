'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useRef, useEffect, useState, Suspense, useCallback } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { useSimulatedProgress } from '@/hooks/use-simulated-progress';
import { detectContentType } from '@/utils/content-type-detection';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { apiService, ApiError } from '@/services/api';

// This page handles:
// 1. ?id=X - Redirects to /post/X (canonical route)
// 2. ?url=X - Converts music link and renders content directly (no redirect)
// 3. ?data=X - Parses JSON payload and renders content directly

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function PostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [apiComplete, setApiComplete] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const postIdParam = searchParams.get('id');
  const fromParam = searchParams.get('from');
  const urlParam = searchParams.get('url');
  const dataParam = searchParams.get('data');
  const descriptionParam = searchParams.get('description');
  const fromAddMusic = searchParams.get('fromAddMusic') === 'true';

  // Use the conversion mutation
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion({
    anonymous: !fromAddMusic
  });

  // Progress simulation for conversion
  const currentUrl = urlParam ? decodeURIComponent(urlParam) : '';
  const contentInfo = detectContentType(currentUrl, null);
  const progressState = useSimulatedProgress(
    { contentType: contentInfo.type, estimatedCount: contentInfo.estimatedCount },
    () => {}, // onComplete - not needed since we handle via apiComplete
    apiComplete
  );
  const progressPercent = Math.max(6, Math.min(100, Math.round(progressState.progress)));

  // Guards against duplicate conversions
  const hasConvertedRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const convertRetryCountRef = useRef(0);
  const actionIdempotencyKeyRef = useRef<string | null>(null);

  const getOrCreateIdempotencyKey = useCallback(() => {
    if (actionIdempotencyKeyRef.current) {
      return actionIdempotencyKeyRef.current;
    }
    const key = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client-key-${Date.now()}-${Math.random()}`;
    actionIdempotencyKeyRef.current = key;
    return key;
  }, []);

  const waitForPostAvailability = useCallback(async (postId: string) => {
    // Only wait for authenticated add-music flow where write/read lag has been observed.
    if (!fromAddMusic) return true;

    const backoffMs = [200, 300, 500, 800, 1200, 1800];
    for (let i = 0; i < backoffMs.length; i += 1) {
      if (!isMountedRef.current) return false;
      try {
        const response = await apiService.fetchPostById(postId);
        if (response?.success) return true;
      } catch (error) {
        const retryAfterMs = error instanceof ApiError && typeof error.retryAfterMs === 'number'
          ? error.retryAfterMs
          : undefined;
        if (retryAfterMs) {
          await sleep(Math.max(100, retryAfterMs));
          continue;
        }
        // Keep polling briefly until the post is readable.
      }
      await sleep(backoffMs[i]);
    }
    return false;
  }, [fromAddMusic]);

  const resolvePostAndRender = useCallback(async (postId: string) => {
    const isReady = await waitForPostAvailability(postId);
    if (!isMountedRef.current) return;
    if (!isReady) {
      setError('Post is still finalizing. Please try again in a moment.');
      setApiComplete(true);
      return;
    }
    const fromQuery = fromParam ? `?from=${encodeURIComponent(fromParam)}` : '';
    router.replace(`/post/${postId}${fromQuery}`);
  }, [fromParam, waitForPostAvailability, router]);

  const shouldRetryConvertError = (err: unknown) => {
    if (err instanceof ApiError) {
      const status = err.status || 0;
      return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
    }

    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      return msg.includes('timed out') || msg.includes('network') || msg.includes('fetch') || msg.includes('temporar');
    }

    return false;
  };

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 900);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Handle ?id= redirect to canonical route (this is the only case we redirect)
    if (postIdParam && !urlParam && !dataParam) {
      const fromQuery = fromParam ? `?from=${encodeURIComponent(fromParam)}` : '';
      router.replace(`/post/${postIdParam}${fromQuery}`);
      return;
    }

    // Handle ?url= conversion flow - render content directly, no redirect
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);
      const detected = detectContentType(decodedUrl);

      // Prevent duplicate mutate calls
      if (hasConvertedRef.current && lastUrlRef.current === decodedUrl) return;
      hasConvertedRef.current = true;
      lastUrlRef.current = decodedUrl;
      convertRetryCountRef.current = 0;
      actionIdempotencyKeyRef.current = null;

      void captureClientEvent('conversion_entry_started', {
        route: '/post',
        source_surface: fromAddMusic ? 'add_music' : 'post_direct',
        source_platform: detected.platform,
        element_type_guess: detected.type,
        source_domain: sanitizeDomain(decodedUrl),
        is_authenticated: fromAddMusic,
      });

      const idempotencyKey = getOrCreateIdempotencyKey();
      const attemptConvert = () => convertLink({ url: decodedUrl, description: descriptionParam || undefined, idempotencyKey }, {
        onSuccess: (result) => {
          setApiComplete(true);
          // Store postId to render content directly - no redirect!
          if (result.postId) {
            void resolvePostAndRender(result.postId);
          } else {
            setError('Conversion completed, but no post was returned.');
          }
        },
        onError: (err) => {
          if (shouldRetryConvertError(err) && convertRetryCountRef.current < 2) {
            const retryDelay = [700, 1500][convertRetryCountRef.current] || 1500;
            convertRetryCountRef.current += 1;
            setError(null);
            window.setTimeout(() => {
              if (isMountedRef.current) {
                attemptConvert();
              }
            }, retryDelay);
            return;
          }

          console.error('Conversion failed:', err);
          setApiComplete(true);
          setError(err instanceof Error ? err.message : 'Failed to convert link');
        },
      });
      attemptConvert();
      return;
    }

    // Handle ?data= JSON payload
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));

        // If the data has a postId, use it directly
        if (parsedData.postId) {
          setApiComplete(true);
          void resolvePostAndRender(parsedData.postId);
          return;
        }

        // Transform the data and try to extract a postId
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

        // Map platform URLs
        if (parsedData.platforms && typeof parsedData.platforms === 'object') {
          Object.entries(parsedData.platforms as Record<string, { url?: string } | undefined>).forEach(([platform, data]) => {
            if (!data?.url) return;
            let platformKey = platform.toLowerCase();
            if (platformKey === 'applemusic') platformKey = 'appleMusic';
            if (['spotify', 'applemusic', 'appleMusic', 'deezer'].includes(platform)) {
              (transformedFromData.convertedUrls as Record<string, string>)[platformKey] = data.url;
            }
          });
        }

        // Map tracks
        type IncomingDataTrack = {
          trackNumber?: number;
          title?: string;
          duration?: string;
          artist?: string;
          artists?: string[];
          previewUrl?: string | null;
          spotifyTrackId?: string;
        };

        if (Array.isArray(parsedData.tracks)) {
          const mappedTracks: MediaListTrack[] = parsedData.tracks.map((t: IncomingDataTrack, idx: number) => ({
            trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : idx + 1,
            title: t.title || 'Untitled',
            duration: t.duration || undefined,
            artists: t.artist ? [t.artist] : Array.isArray(t.artists) ? t.artists : undefined,
            previewUrl: t.previewUrl || undefined,
            spotifyTrackId: t.spotifyTrackId,
          }));
          transformedFromData.tracks = mappedTracks;
        }

        // For ?data= without postId, convert the URL to get a postId
        if (transformedFromData.originalUrl) {
          const detected = detectContentType(transformedFromData.originalUrl);
          void captureClientEvent('conversion_entry_started', {
            route: '/post',
            source_surface: 'post_direct',
            source_platform: detected.platform,
            element_type_guess: detected.type,
            source_domain: sanitizeDomain(transformedFromData.originalUrl),
          });

          convertRetryCountRef.current = 0;
          actionIdempotencyKeyRef.current = null;
          const idempotencyKey = getOrCreateIdempotencyKey();
          const attemptConvert = () => convertLink({ url: transformedFromData.originalUrl, description: transformedFromData.description, idempotencyKey }, {
            onSuccess: (result) => {
              setApiComplete(true);
              if (result.postId) {
                void resolvePostAndRender(result.postId);
              } else {
                setError('Conversion completed, but no post was returned.');
              }
            },
            onError: (err) => {
              if (shouldRetryConvertError(err) && convertRetryCountRef.current < 2) {
                const retryDelay = [700, 1500][convertRetryCountRef.current] || 1500;
                convertRetryCountRef.current += 1;
                setError(null);
                window.setTimeout(() => {
                  if (isMountedRef.current) {
                    attemptConvert();
                  }
                }, retryDelay);
                return;
              }

              console.error('Conversion failed:', err);
              setApiComplete(true);
              setError(err instanceof Error ? err.message : 'Failed to convert link');
            },
          });
          attemptConvert();
        } else {
          setError('No data provided');
        }
      } catch (e) {
        console.error('Error parsing data:', e);
        setError('Invalid data format');
      }
      return;
    }

    // No valid parameters
    if (!urlParam && !dataParam && !postIdParam) {
      if (!hasConvertedRef.current) {
        setError('No data provided');
      }
    }
  }, [searchParams, router, convertLink, postIdParam, fromParam, urlParam, dataParam, descriptionParam, fromAddMusic, resolvePostAndRender, getOrCreateIdempotencyKey]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-4">
            <svg className="w-16 h-16 text-danger mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Unable to load content</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <BackButton variant="button" buttonVariant="default" fallbackRoute="/" />
        </div>
      </div>
    );
  }

  // Once we have a postId, render the content directly - no redirect needed!
  // This provides a seamless skeleton → content transition
  // Show unified skeleton with progress overlay while converting
  // This is the SAME skeleton that PostClientPage uses, ensuring no layout shift
  const showProgress = isConverting || !!urlParam;

  return (
    <EntitySkeleton
      isDesktop={isDesktop}
      showProgress={!!showProgress}
      progressPercent={progressPercent}
      progressStepName={progressState.currentStepName}
      onCancel={() => router.back()}
    />
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<EntitySkeleton />}>
      <PostPageContent />
    </Suspense>
  );
}
