'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTopCharts, useMusicSearch } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { CONVERSION_STAGE_LABELS } from '@/hooks/use-conversion-stage';
import { captureClientEvent } from '@/lib/analytics/client';
import { HANDOFF_BEAT_MS, handOffConversion } from '@/lib/conversion-handoff';
import { apiService } from '@/services/api';
import { playErrorTone, playLinkRecognized } from '@/lib/sounds';
import { detectContentType } from '@/utils/content-type-detection';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import {
  normalizeMusicLinkInput,
  isSupportedMusicLink,
  isPasteLikeInputEvent,
  validateMusicLink,
} from '@/utils/music-link-input';
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';

export interface ConvertingMeta {
  title?: string;
  kicker: string;
  fallbackLabel: string;
  headline: string;
}

/**
 * The home search and convert flow, lifted out of the home page so every
 * hero layout shares one behaviour: type to search the catalog, paste a
 * Spotify, Apple Music, or Deezer link or pick a result to convert it.
 * The bar lights up, then hands the conversion to /post?url=, where the bar
 * grows into the post and the post builds as Bridge reports results.
 * `/?url=` still starts a conversion directly.
 */
export function useHomeSearch() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const [musicUrl, setMusicUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  // Set while the bar hands a conversion to /post; doubles as the converting flag.
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  const [convertingMeta, setConvertingMeta] = useState<ConvertingMeta | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // The URL bar box: /post grows the post out of it.
  const barRef = useRef<HTMLDivElement>(null);
  const handoffTimerRef = useRef<number | undefined>(undefined);
  const lastTrackedSearchRef = useRef('');
  const debouncedSearchTerm = useDebounce(musicUrl, 300);

  const { isAuthenticated, isLoading: isAuthLoading } = useAuthState();
  const isConverting = conversionKey != null;
  const conversionStageLabel = CONVERSION_STAGE_LABELS.parsing_source;
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();

  const isQuery = debouncedSearchTerm.length >= 2 && !debouncedSearchTerm.includes('http');
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(isQuery ? debouncedSearchTerm : '');
  const displayData = isQuery ? searchResultsData : topCharts;
  const showSearchResults = musicUrl.length >= 2 && !musicUrl.includes('http');

  const analyticsBase = useCallback((url: string) => {
    const detected = detectContentType(url);
    return {
      route: pathname,
      source_surface: 'home' as const,
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(url),
      is_authenticated: isAuthenticated,
    };
  }, [pathname, isAuthenticated]);

  // The conversion page loads before the bar's beat ends. A visitor who leaves
  // during the beat does not get sent to /post afterwards.
  useEffect(() => {
    router.prefetch('/post');
    return () => window.clearTimeout(handoffTimerRef.current);
  }, [router]);

  const convertLink = useCallback((url: string, item?: { title: string; type: string }) => {
    const trimmed = normalizeMusicLinkInput(url);
    // Until the auth store settles, a signed-in user would convert anonymously:
    // the post would not attach to their profile, and stage polling would use the
    // wrong scope. A paste in that first moment does nothing; a /?url= link waits.
    if (!trimmed || conversionKey || isAuthLoading) return;

    const detected = detectContentType(trimmed);
    void captureClientEvent('conversion_entry_started', analyticsBase(trimmed));

    const platformLabel = PLATFORM_LABELS[detected.platform];
    const typeLabel = item?.type ?? (detected.id ? detected.type : null);
    setConvertingMeta({
      title: item?.title,
      // Search picks hide the catalog source; pasted links name their platform.
      kicker: item
        ? ['Converting', typeLabel].filter(Boolean).join(' ')
        : ['Converting', platformLabel, typeLabel].filter(Boolean).join(' '),
      fallbackLabel: platformLabel ? `${platformLabel} link` : 'Music link',
      headline: pickConvertingHeadline(),
    });

    const key = 'randomUUID' in crypto ? crypto.randomUUID() : `key-${Date.now()}-${Math.random()}`;
    setUrlError(null);
    setConversionKey(key);
    setIsSearchActive(false);
    inputRef.current?.blur();

    // /post runs the conversion, shows its errors, and lands on the finished post.
    handoffTimerRef.current = window.setTimeout(() => {
      // Measured now: the converting heading moves the bar during the beat.
      const bar = barRef.current?.getBoundingClientRect();
      handOffConversion({
        url: trimmed,
        anonymous: !isAuthenticated,
        barRect: bar ? { left: bar.left, top: bar.top, width: bar.width, height: bar.height } : null,
      });
      router.push(`/post?url=${encodeURIComponent(trimmed)}`);
    }, HANDOFF_BEAT_MS);
  }, [conversionKey, isAuthenticated, isAuthLoading, router, analyticsBase]);

  // A pasted value either converts (supported link), errors (unsupported), or
  // is left alone (plain text). Returns true when it was handled as a paste.
  const acceptPaste = useCallback((value: string) => {
    const validationError = validateMusicLink(value);
    setMusicUrl(value);
    setUrlError(validationError);
    if (validationError) {
      playErrorTone();
      void captureClientEvent('unsupported_music_link_pasted', analyticsBase(value));
      return true;
    }
    if (isSupportedMusicLink(value)) {
      playLinkRecognized();
      void captureClientEvent('music_link_pasted', analyticsBase(value));
      convertLink(value);
      return true;
    }
    return false;
  }, [analyticsBase, convertLink]);

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const normalized = normalizeMusicLinkInput(value);
    if (isPasteLikeInputEvent(event) && normalized && acceptPaste(normalized)) return;
    setMusicUrl(value);
    setUrlError(validateMusicLink(value));
    if (value.trim()) setIsSearchActive(true);
  }, [acceptPaste]);

  const onPaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    apiService.warmupLambdas();
    const pasted = normalizeMusicLinkInput(event.clipboardData.getData('text'));
    if (!pasted) return;
    event.preventDefault();
    if (!acceptPaste(pasted)) {
      void captureClientEvent('unsupported_music_link_pasted', analyticsBase(pasted));
    }
  }, [acceptPaste, analyticsBase]);

  const close = useCallback(() => {
    setIsSearchActive(false);
    setMusicUrl('');
    inputRef.current?.blur();
  }, []);

  // Hides the results without clearing the text (for dropdown layouts).
  const dismiss = useCallback(() => setIsSearchActive(false), []);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Enter' && musicUrl.trim()) {
      const validationError = validateMusicLink(musicUrl);
      setUrlError(validationError);
      if (!validationError && musicUrl.includes('http')) convertLink(musicUrl.trim());
    }
  }, [musicUrl, convertLink, close]);

  const onFocus = useCallback(() => {
    apiService.warmupLambdas();
    if (!isConverting) setIsSearchActive(true);
  }, [isConverting]);

  const selectItem = useCallback((url: string, title: string, type: string) => {
    void captureClientEvent('search_result_selected', analyticsBase(url));
    convertLink(url, { title, type: type.toLowerCase() });
  }, [analyticsBase, convertLink]);

  // /?url=<music link> starts the conversion directly, once auth has settled.
  // Each link in the query runs once; a query without one re-arms it, so a
  // later /?url= link still works after an earlier conversion failed. A link
  // that arrives during a conversion stays in the query until that one ends.
  const searchParams = useSearchParams();
  const handledUrl = useRef<string | null>(null);
  useEffect(() => {
    const prefill = searchParams?.get('url');
    if (!prefill) {
      handledUrl.current = null;
      return;
    }
    if (isAuthLoading || isConverting || prefill === handledUrl.current) return;
    handledUrl.current = prefill;
    const normalized = normalizeMusicLinkInput(prefill);
    if (!normalized || !isSupportedMusicLink(normalized)) return;
    setMusicUrl(normalized);
    convertLink(normalized);
    router.replace(pathname, { scroll: false });
  }, [searchParams, isAuthLoading, isConverting, convertLink, router, pathname]);

  useEffect(() => {
    const query = debouncedSearchTerm.trim();
    if (!query || query.length < 2 || query.includes('http')) return;
    if (lastTrackedSearchRef.current === query.toLowerCase()) return;
    lastTrackedSearchRef.current = query.toLowerCase();
    const resultCount = (searchResultsData?.tracks?.length || 0)
      + (searchResultsData?.albums?.length || 0)
      + (searchResultsData?.artists?.length || 0)
      + (searchResultsData?.playlists?.length || 0);
    void captureClientEvent('search_submitted', {
      route: pathname,
      source_surface: 'home' as const,
      result_count: resultCount,
      is_authenticated: isAuthenticated,
    });
  }, [debouncedSearchTerm, searchResultsData, isAuthenticated, pathname]);

  return {
    inputRef,
    barRef,
    musicUrl,
    urlError,
    isConverting,
    convertingMeta,
    conversionStageLabel,
    isSearchActive,
    isHelpModalOpen,
    setIsHelpModalOpen,
    displayData,
    debouncedSearchTerm,
    isLoadingCharts,
    isSearchingMusic,
    showSearchResults,
    topCharts,
    isAuthenticated,
    onChange,
    onPaste,
    onKeyDown,
    onFocus,
    selectItem,
    close,
    dismiss,
  };
}

export type HomeSearch = ReturnType<typeof useHomeSearch>;
