'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useRef, useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { MusicLinkConversion, ElementType, MediaListTrack } from '@/types';
import { EntitySkeleton, type StagedConversion } from '@/components/features/entity/entity-skeleton';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { clearConversionHandoff, growthBox, readConversionHandoff } from '@/lib/conversion-handoff';
import { returnAddMusicDraft } from '@/lib/add-music-draft';
import { playErrorTone } from '@/lib/sounds';
import { savePrefetchedPost } from '@/lib/post-prefetch';
import { getPlatformDefinition } from '@/lib/platforms';
import { detectContentType, getPlatformDisplayName } from '@/utils/content-type-detection';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { apiService, ApiError } from '@/services/api';
import { captureUiException } from '@/lib/observability/error-reporting';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

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
  // The post the conversion created; its page continues the staged content.
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const postIdParam = searchParams.get('id');
  const fromParam = searchParams.get('from');
  const urlParam = searchParams.get('url');
  const dataParam = searchParams.get('data');
  const descriptionParam = searchParams.get('description');
  const fromAddMusic = searchParams.get('fromAddMusic') === 'true';

  // A conversion handed over by the home URL bar (convert the link exactly as the
  // home page read it, with the auth scope it settled) or by Add music (follow the
  // conversion it started). Either way the post grows out of the bar or card.
  // The router has already decoded `url`, which is how both encoded it.
  const [handoff] = useState(() => (urlParam ? readConversionHandoff(urlParam) : null));
  const [growFrom] = useState(() => growthBox(handoff));
  useEffect(() => {
    if (handoff) clearConversionHandoff(handoff);
  }, [handoff]);
  const handedOff = handoff && handoff.url === urlParam ? handoff : null;
  const currentUrl = handedOff?.url ?? (urlParam ? decodeURIComponent(urlParam) : '');
  const contentInfo = detectContentType(currentUrl, null);
  const anonymous = handedOff ? handedOff.anonymous : !fromAddMusic;
  // Add music writes the post under the signed-in person, where read lag has been seen.
  const addMusicWrite = fromAddMusic || Boolean(handedOff?.running);
  // Idempotency key of the running conversion; Bridge's job row is polled by it.
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  const polled = useConversionStage(conversionKey, { anonymous, intervalMs: 500 });
  // A handed-over conversion shows what Bridge already reported until the first poll returns.
  const reported = handedOff?.running?.reported;
  const partialResult = polled.partialResult ?? reported?.partialResult ?? null;
  const stageLabel = polled.stage ? polled.label : reported?.stageLabel ?? polled.label;
  const sourceLinkPlatform = getPlatformDefinition(contentInfo.platform)?.uiKey;
  // What the post shows so far: the source link from the start, then the source
  // details and each matched service as Bridge reports them.
  const conversion = useMemo<StagedConversion>(() => {
    const links: StagedConversion['links'] = {};
    if (sourceLinkPlatform && currentUrl) links[sourceLinkPlatform] = currentUrl;
    for (const [platform, url] of Object.entries(partialResult?.platforms ?? {})) {
      const key = getPlatformDefinition(platform)?.uiKey;
      if (key && url) links[key] = url;
    }
    const source = partialResult?.source;
    return {
      stageLabel,
      source: source?.title
        ? {
            elementType: source.elementType,
            title: source.title,
            artists: source.artists ?? [],
            artworkUrl: source.artworkUrl,
            tracks: source.tracks?.map((track) => ({
              title: track.title,
              artists: track.artists,
              duration: track.duration ?? undefined,
            })),
          }
        : undefined,
      sourceLink: sourceLinkPlatform && currentUrl ? { platform: sourceLinkPlatform, url: currentUrl } : undefined,
      curatorLinks: handedOff?.curatorLinks,
      links,
      ready: apiComplete,
      postId: createdPostId ?? undefined,
    };
  }, [partialResult, stageLabel, apiComplete, createdPostId, currentUrl, sourceLinkPlatform, handedOff?.curatorLinks]);

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

  // Reads the new post and stashes it for /post/[id], which then renders it at once
  // in place of the staged one. Only the signed-in add-music flow retries, where
  // write/read lag has been observed; elsewhere one read warms the handoff.
  const waitForPostAvailability = useCallback(async (postId: string) => {
    const backoffMs = addMusicWrite ? [200, 300, 500, 800, 1200, 1800] : [0];
    for (let i = 0; i < backoffMs.length; i += 1) {
      if (!isMountedRef.current) return false;
      try {
        const response = await apiService.fetchPostById(postId);
        if (response?.success) {
          savePrefetchedPost(postId, response);
          return true;
        }
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
    // Without the add-music lag, /post/[id] can load the post itself.
    return !addMusicWrite;
  }, [addMusicWrite]);

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

  const handleConvertSuccess = useCallback((result: Awaited<ReturnType<typeof apiService.convertMusicLink>>) => {
    setApiComplete(true);
    if (result.postId) {
      setCreatedPostId(result.postId);
      void resolvePostAndRender(result.postId);
      return;
    }
    setError('Conversion completed, but no post was returned.');
  }, [resolvePostAndRender]);

  // Use the conversion mutation
  const { mutateAsync: convertLink, isPending: isConverting } = useMusicLinkConversion({ anonymous });

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
      const decodedUrl = handedOff?.url ?? decodeURIComponent(urlParam);
      const detected = detectContentType(decodedUrl);

      // Prevent duplicate mutate calls
      if (hasConvertedRef.current && lastUrlRef.current === decodedUrl) return;
      hasConvertedRef.current = true;
      lastUrlRef.current = decodedUrl;
      convertRetryCountRef.current = 0;
      actionIdempotencyKeyRef.current = null;

      // The home page already counted a conversion it handed over.
      if (!handedOff) {
        void captureClientEvent('conversion_entry_started', {
          route: '/post',
          source_surface: fromAddMusic ? 'add_music' : 'post_direct',
          source_platform: detected.platform,
          element_type_guess: detected.type,
          source_domain: sanitizeDomain(decodedUrl),
          is_authenticated: !anonymous,
        });
      }

      // Add music hands over a conversion it already started: follow it, do not start another.
      const running = handedOff?.running;
      if (running) {
        setConversionKey(running.idempotencyKey);
        const followConversion = async (): Promise<void> => {
          try {
            const result = await running.result;
            if (isMountedRef.current) handleConvertSuccess(result);
          } catch (err) {
            if (!isMountedRef.current) return;
            captureUiException(err, { route: '/post', operation: 'conversion_entry' });
            const message = getUserFacingApiErrorMessage(err, 'Failed to convert this link. Please try again.');
            // Add music gets its form back as it was left, with the error, to retry from.
            const draft = returnAddMusicDraft(running.idempotencyKey, message);
            if (draft) {
              playErrorTone();
              if (draft.pushed) {
                router.back();
              } else {
                router.replace(draft.path);
              }
              return;
            }
            setApiComplete(true);
            setError(message);
          }
        };
        void followConversion();
        return;
      }

      const idempotencyKey = getOrCreateIdempotencyKey();
      setConversionKey(idempotencyKey);
      const attemptConvert = async (): Promise<void> => {
        try {
          const result = await convertLink({
            url: decodedUrl,
            description: descriptionParam || undefined,
            idempotencyKey,
            anonymous,
          });
          handleConvertSuccess(result);
        } catch (err) {
          if (shouldRetryConvertError(err) && convertRetryCountRef.current < 2) {
            const retryDelay = [700, 1500][convertRetryCountRef.current] || 1500;
            convertRetryCountRef.current += 1;
            setError(null);
            window.setTimeout(() => {
              if (isMountedRef.current) {
                void attemptConvert();
              }
            }, retryDelay);
            return;
          }

          captureUiException(err, { route: '/post', operation: 'conversion_entry' });
          setApiComplete(true);
          setError(getUserFacingApiErrorMessage(err, 'Failed to convert this link. Please try again.'));
        }
      };
      void attemptConvert();
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
          setConversionKey(idempotencyKey);
          const attemptConvert = async (): Promise<void> => {
            try {
              const result = await convertLink({
                url: transformedFromData.originalUrl,
                description: transformedFromData.description,
                idempotencyKey,
                anonymous,
              });
              handleConvertSuccess(result);
            } catch (err) {
              if (shouldRetryConvertError(err) && convertRetryCountRef.current < 2) {
                const retryDelay = [700, 1500][convertRetryCountRef.current] || 1500;
                convertRetryCountRef.current += 1;
                setError(null);
                window.setTimeout(() => {
                  if (isMountedRef.current) {
                    void attemptConvert();
                  }
                }, retryDelay);
                return;
              }

              captureUiException(err, { route: '/post', operation: 'conversion_entry_data' });
              setApiComplete(true);
              setError(getUserFacingApiErrorMessage(err, 'Failed to convert this link. Please try again.'));
            }
          };
          void attemptConvert();
        } else {
          setError('No data provided');
        }
      } catch (e) {
        captureUiException(e, { route: '/post', operation: 'post_data_parse' });
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
  }, [searchParams, router, convertLink, postIdParam, fromParam, urlParam, dataParam, descriptionParam, fromAddMusic, anonymous, handedOff, resolvePostAndRender, getOrCreateIdempotencyKey, handleConvertSuccess]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-4">
            <svg className="w-16 h-16 text-danger mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Unable to load content</h2>
          <p role="alert" className="text-muted-foreground mb-6">{error}</p>
          <BackButton variant="button" buttonVariant="default" fallbackRoute="/" />
        </div>
      </div>
    );
  }

  // The same skeleton PostClientPage uses, filled with what Bridge has reported so
  // far. The finished post then replaces it in place at /post/[id].
  const sourceLabel = contentInfo.platform === 'unknown'
    ? contentInfo.type
    : `${getPlatformDisplayName(contentInfo.platform)} · ${contentInfo.type}`;

  return (
    <EntitySkeleton
      conversion={isConverting || urlParam ? conversion : undefined}
      growFrom={growFrom}
      sourceLabel={sourceLabel}
      contentType={contentInfo.type}
      showAuthor={!anonymous}
      // A signed-in conversion creates the viewer's own post.
      ownPost={!anonymous}
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
