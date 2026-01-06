'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useRef, useEffect, useState, Suspense } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { useSimulatedProgress } from '@/hooks/use-simulated-progress';
import { detectContentType } from '@/utils/content-type-detection';
import PostClientPage from './[id]/post-client';

// This page handles:
// 1. ?id=X - Redirects to /post/X (canonical route)
// 2. ?url=X - Converts music link and renders content directly (no redirect)
// 3. ?data=X - Parses JSON payload and renders content directly

function PostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [apiComplete, setApiComplete] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  // Store postId after conversion - renders content directly without redirect
  const [resolvedPostId, setResolvedPostId] = useState<string | null>(null);

  const postIdParam = searchParams.get('id');
  const urlParam = searchParams.get('url');
  const dataParam = searchParams.get('data');
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

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 900);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    // If we already have a resolved postId, don't process params again
    // This prevents re-running after URL update via history.replaceState
    if (resolvedPostId) {
      return;
    }

    // Handle ?id= redirect to canonical route (this is the only case we redirect)
    if (postIdParam && !urlParam && !dataParam) {
      router.replace(`/post/${postIdParam}`);
      return;
    }

    // Handle ?url= conversion flow - render content directly, no redirect
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);

      // Prevent duplicate mutate calls
      if (hasConvertedRef.current && lastUrlRef.current === decodedUrl) return;
      hasConvertedRef.current = true;
      lastUrlRef.current = decodedUrl;

      convertLink(decodedUrl, {
        onSuccess: (result) => {
          setApiComplete(true);
          // Store postId to render content directly - no redirect!
          if (result.postId) {
            setResolvedPostId(result.postId);
            // Update URL without navigation for shareability
            window.history.replaceState(null, '', `/post/${result.postId}`);
          }
        },
        onError: (err) => {
          console.error('Conversion failed:', err);
          setApiComplete(true);
          setError(err instanceof Error ? err.message : 'Failed to convert link');
        },
      });
      return;
    }

    // Handle ?data= JSON payload
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));

        // If the data has a postId, use it directly
        if (parsedData.postId) {
          setResolvedPostId(parsedData.postId);
          setApiComplete(true);
          window.history.replaceState(null, '', `/post/${parsedData.postId}`);
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
        };

        if (Array.isArray(parsedData.tracks)) {
          const mappedTracks: MediaListTrack[] = parsedData.tracks.map((t: IncomingDataTrack, idx: number) => ({
            trackNumber: typeof t.trackNumber === 'number' ? t.trackNumber : idx + 1,
            title: t.title || 'Untitled',
            duration: t.duration || undefined,
            artists: t.artist ? [t.artist] : Array.isArray(t.artists) ? t.artists : undefined,
            previewUrl: t.previewUrl || undefined,
          }));
          transformedFromData.tracks = mappedTracks;
        }

        // For ?data= without postId, convert the URL to get a postId
        if (transformedFromData.originalUrl) {
          convertLink(transformedFromData.originalUrl, {
            onSuccess: (result) => {
              setApiComplete(true);
              if (result.postId) {
                setResolvedPostId(result.postId);
                window.history.replaceState(null, '', `/post/${result.postId}`);
              }
            },
            onError: (err) => {
              console.error('Conversion failed:', err);
              setApiComplete(true);
              setError(err instanceof Error ? err.message : 'Failed to convert link');
            },
          });
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
      setError('No data provided');
    }
  }, [searchParams, router, convertLink, postIdParam, urlParam, dataParam, resolvedPostId]);

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
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Once we have a postId, render the content directly - no redirect needed!
  // This provides a seamless skeleton → content transition
  if (resolvedPostId) {
    return <PostClientPage postId={resolvedPostId} />;
  }

  // Show unified skeleton with progress overlay while converting
  // This is the SAME skeleton that PostClientPage uses, ensuring no layout shift
  const showProgress = isConverting || (urlParam && !apiComplete);

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
