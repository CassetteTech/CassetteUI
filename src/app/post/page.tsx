'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useRef, useEffect, useState, Suspense } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { ConversionProgress } from '@/components/features/conversion/conversion-progress';
import { useMusicLinkConversion } from '@/hooks/use-music';

// This page now handles:
// 1. ?id=X - Redirects to /post/X (new canonical route)
// 2. ?url=X - Converts music link and redirects to /post/{postId} after success
// 3. ?data=X - Parses JSON payload and redirects to /post/{postId} if available

function PostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [apiComplete, setApiComplete] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const postIdParam = searchParams.get('id');
  const urlParam = searchParams.get('url');
  const dataParam = searchParams.get('data');
  const fromAddMusic = searchParams.get('fromAddMusic') === 'true';

  // Use the conversion mutation
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion({
    anonymous: !fromAddMusic
  });

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
    // Handle ?id= redirect to new canonical route
    if (postIdParam && !urlParam && !dataParam) {
      router.replace(`/post/${postIdParam}`);
      return;
    }

    // Handle ?url= conversion flow
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam);

      // Prevent duplicate mutate calls
      if (hasConvertedRef.current && lastUrlRef.current === decodedUrl) return;
      hasConvertedRef.current = true;
      lastUrlRef.current = decodedUrl;

      convertLink(decodedUrl, {
        onSuccess: (result) => {
          setApiComplete(true);
          // Redirect to the new canonical route
          if (result.postId) {
            router.replace(`/post/${result.postId}`);
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

        // If the data has a postId, redirect to the canonical route
        if (parsedData.postId) {
          router.replace(`/post/${parsedData.postId}`);
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

        // For ?data= without postId, we need to convert the URL to get a postId
        // or redirect to a conversion flow. For now, if we have an originalUrl, convert it.
        if (transformedFromData.originalUrl) {
          convertLink(transformedFromData.originalUrl, {
            onSuccess: (result) => {
              setApiComplete(true);
              if (result.postId) {
                router.replace(`/post/${result.postId}`);
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
  }, [searchParams, router, convertLink, postIdParam, urlParam, dataParam]);

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

  // Show conversion progress while converting
  if (isConverting || (urlParam && !apiComplete)) {
    const currentUrl = urlParam ? decodeURIComponent(urlParam) : '';

    return (
      <ConversionProgress
        url={currentUrl}
        metadata={null}
        apiComplete={apiComplete}
        onComplete={() => {
          console.log('Conversion progress completed');
        }}
        onCancel={() => {
          router.back();
        }}
        isDesktop={isDesktop}
      />
    );
  }

  // Show skeleton while redirecting
  return <EntitySkeleton isDesktop={isDesktop} />;
}

export default function PostPage() {
  return (
    <Suspense fallback={<EntitySkeleton isDesktop={false} />}>
      <PostPageContent />
    </Suspense>
  );
}
