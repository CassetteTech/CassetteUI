'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useRef, useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { EntitySkeleton, type StagedConversion } from '@/components/features/entity/entity-skeleton';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { clearConversionHandoff, growthBox, readConversionHandoff } from '@/lib/conversion-handoff';
import { returnAddMusicDraft } from '@/lib/add-music-draft';
import { playErrorTone } from '@/lib/sounds';
import { savePrefetchedPost } from '@/lib/post-prefetch';
import { parsePostResponse, type PostPageData } from '@/services/post-response';
import { getPlatformDefinition } from '@/lib/platforms';
import { detectContentType, getPlatformDisplayName } from '@/utils/content-type-detection';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { apiService, ApiError } from '@/services/api';
import { captureUiException } from '@/lib/observability/error-reporting';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function PostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [apiComplete, setApiComplete] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  // The finished post, read before the hand-off: the skeleton settles to what the post shows.
  const [readPost, setReadPost] = useState<PostPageData | null>(null);

  const postIdParam = searchParams.get('id');
  const fromParam = searchParams.get('from');
  const urlParam = searchParams.get('url');
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
  const currentUrl = urlParam ?? '';
  const contentInfo = detectContentType(currentUrl, null);
  const anonymous = handedOff ? handedOff.anonymous : !fromAddMusic;
  // Add music writes the post under the signed-in person, where read lag has been seen.
  const addMusicWrite = fromAddMusic || Boolean(handedOff?.running);
  const viewerId = useAuthState().user?.id ?? null;
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  const polled = useConversionStage(conversionKey, { anonymous, intervalMs: 500 });
  const reported = handedOff?.running?.reported;
  const partialResult = polled.partialResult ?? reported?.partialResult ?? null;
  const stageLabel = polled.stage ? polled.label : reported?.stageLabel ?? polled.label;
  const sourceLinkPlatform = getPlatformDefinition(contentInfo.platform)?.uiKey;
  const conversion = useMemo<StagedConversion>(() => {
    const links: StagedConversion['links'] = {};
    if (readPost) {
      // The finished post's own links: one that landed after the last poll shows before the
      // hand-off, and one Bridge dropped after reporting it leaves.
      Object.assign(links, readPost.convertedUrls);
    } else {
      if (sourceLinkPlatform && currentUrl) links[sourceLinkPlatform] = currentUrl;
      for (const [platform, url] of Object.entries(partialResult?.platforms ?? {})) {
        const key = getPlatformDefinition(platform)?.uiKey;
        if (key && url) links[key] = url;
      }
    }
    const readCuratorLinks = readPost?.curatorLinks && Object.keys(readPost.curatorLinks).length > 0
      ? { handle: readPost.username ?? null, links: readPost.curatorLinks }
      : undefined;
    const source = partialResult?.source;
    const details = readPost
      ? { duration: readPost.metadata.duration, albumName: readPost.albumName, releaseDate: readPost.releaseDate }
      : undefined;
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
            details,
          }
        : readPost
          // No poll reported the source (a reused job can be ready at once): settle to the post.
          ? {
              elementType: readPost.metadata.type,
              title: readPost.metadata.title,
              artists: readPost.metadata.artist ? [readPost.metadata.artist] : [],
              artworkUrl: readPost.metadata.artwork || null,
              tracks: readPost.tracks,
              details,
            }
          : undefined,
      sourceLink: sourceLinkPlatform && currentUrl ? { platform: sourceLinkPlatform, url: currentUrl } : undefined,
      // Once read, the finished post's own links win over the Add music draft (Bridge can reuse a
      // job whose stored links differ), even when the post has none.
      curatorLinks: readPost ? readCuratorLinks : handedOff?.curatorLinks,
      links,
      linksFinal: Boolean(readPost),
      cassetteSpotifyCopyUrl: readPost?.cassetteSpotifyCopyUrl,
      ready: apiComplete,
      postId: createdPostId ?? undefined,
    };
  }, [partialResult, readPost, stageLabel, apiComplete, createdPostId, currentUrl, sourceLinkPlatform, handedOff?.curatorLinks]);

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
          savePrefetchedPost(postId, response, viewerId);
          if (isMountedRef.current) setReadPost(parsePostResponse(response, postId));
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
  }, [addMusicWrite, viewerId]);

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
    if (postIdParam && !urlParam) {
      const fromQuery = fromParam ? `?from=${encodeURIComponent(fromParam)}` : '';
      router.replace(`/post/${postIdParam}${fromQuery}`);
      return;
    }

    if (urlParam) {
      const detected = detectContentType(urlParam);

      if (hasConvertedRef.current && lastUrlRef.current === urlParam) return;
      hasConvertedRef.current = true;
      lastUrlRef.current = urlParam;
      convertRetryCountRef.current = 0;
      actionIdempotencyKeyRef.current = null;

      if (!handedOff) {
        void captureClientEvent('conversion_entry_started', {
          route: '/post',
          source_surface: fromAddMusic ? 'add_music' : 'post_direct',
          source_platform: detected.platform,
          element_type_guess: detected.type,
          source_domain: sanitizeDomain(urlParam),
          is_authenticated: !anonymous,
        });
      }

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
            url: urlParam,
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

    if (!urlParam && !postIdParam) {
      if (!hasConvertedRef.current) {
        setError('No data provided');
      }
    }
  }, [searchParams, router, convertLink, postIdParam, fromParam, urlParam, descriptionParam, fromAddMusic, anonymous, handedOff, resolvePostAndRender, getOrCreateIdempotencyKey, handleConvertSuccess]);

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

  // Bridge's element type, once read, wins over the link's guess (a short link reads as a track).
  const elementType = partialResult?.source?.elementType ?? contentInfo.type;
  const sourceLabel = contentInfo.platform === 'unknown'
    ? elementType
    : `${getPlatformDisplayName(contentInfo.platform)} · ${elementType}`;

  return (
    <EntitySkeleton
      conversion={isConverting || urlParam ? conversion : undefined}
      growFrom={growFrom}
      sourceLabel={sourceLabel}
      contentType={elementType}
      showAuthor={!anonymous}
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
