'use client';

import { useState, useEffect, useEffectEvent, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UrlBar } from '@/components/ui/url-bar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StudioChip } from '@/components/features/curator/studio-shell';
import { Music2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopCharts, useMusicSearch, useMusicLinkConversion } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { useSheetViewportPin } from '@/hooks/use-sheet-viewport-pin';
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { ConversionHeading } from '@/components/features/conversion/conversion-heading';
import { ConversionStageLabel } from '@/components/features/conversion/conversion-stage-label';
import { SearchResults } from '@/components/features/search-results';
import { MusicSearchResult } from '@/types';
import { PageLoader } from '@/components/ui/page-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { apiService } from '@/services/api';
import { savePrefetchedPost } from '@/lib/post-prefetch';
import { HANDOFF_BEAT_MS, handOffConversion } from '@/lib/conversion-handoff';
import { clearReturnedAddMusicDraft, holdAddMusicDraft, readReturnedAddMusicDraft } from '@/lib/add-music-draft';
import { playErrorTone, playLinkRecognized } from '@/lib/sounds';
import { detectContentType } from '@/utils/content-type-detection';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import {
  normalizeMusicLinkInput,
  isSupportedMusicLink,
  getMusicSourceLabel,
  isPasteLikeInputEvent,
  validateMusicLink,
} from '@/utils/music-link-input';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { normalizeAuthRedirect } from '@/utils/auth-redirect';
import { PostVisibilityControl } from '@/components/features/post/post-visibility-control';
import { studioLabels, studioViewOfPath } from '@/components/features/curator/studio-routes';
import type { MusicLinkConversion, PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';
import { ignoreFailure } from '@/lib/best-effort';

const LEGACY_ADD_MUSIC_ANALYTICS_ROUTE = '/add-music';

type SelectedItem = {
  id: string;
  title: string;
  artist: string;
  type: string;
  url: string;
  coverArtUrl: string;
};

type ConvertingMeta = {
  title?: string;
  artist?: string;
  artwork?: string;
  kicker: string;
  fallbackLabel: string;
  headline: string;
};

type PickerProps = {
  isSearchActive: boolean;
  selectedItem: SelectedItem | null;
  pastedLinkSource: string | null;
  musicUrl: string;
  debouncedSearchTerm: string;
  handleUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchFocus: () => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearSelection: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  displayData: MusicSearchResult | undefined;
  isLoadingCharts: boolean;
  isSearchingMusic: boolean;
  handleSelectItem: (url: string, title: string, type: string) => void;
  closeSearch: () => void;
  isConverting: boolean;
  convertingMeta: ConvertingMeta | null;
  conversionStageLabel: string;
  rail?: boolean;
};

/** The music picker: the homepage bar, the pending music card, and the
    results. On phones the region becomes a full-screen sheet while searching
    so the input never re-parents (the iOS keyboard stays up). In the desktop
    rail the results stay expanded under the bar. */
const MusicPicker = ({
  isSearchActive,
  selectedItem,
  pastedLinkSource,
  musicUrl,
  debouncedSearchTerm,
  handleUrlChange,
  handleSearchFocus,
  handlePaste,
  handleInputKeyDown,
  clearSelection,
  searchInputRef,
  displayData,
  isLoadingCharts,
  isSearchingMusic,
  handleSelectItem,
  closeSearch,
  isConverting,
  convertingMeta,
  conversionStageLabel,
  rail = false,
}: PickerProps) => {
  // Pin the open sheet to the visual viewport: the iOS keyboard pans the
  // visual viewport, which would otherwise push the bar and the top of the
  // results out of view the moment the input focuses.
  const sheetRef = useSheetViewportPin(isSearchActive);
  const showResults = musicUrl.length >= 2 && !musicUrl.includes('http');
  const pending = selectedItem || pastedLinkSource;
  const cardTitle = selectedItem ? selectedItem.title : `${pastedLinkSource} link pasted`;

  return (
    <div
      ref={sheetRef}
      data-search-region
      className={
        isSearchActive && !rail
          ? 'fixed inset-0 z-[60] flex flex-col'
          : rail
            ? cn('flex min-h-0 flex-col', pending && 'self-stretch justify-center')
            : 'mb-6'
      }
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Sheet backdrop — fades in under the gliding bar; fixed inside an
          untransformed ancestor so it always covers the real viewport */}
      <AnimatePresence>
        {isSearchActive && !rail && (
          <motion.div
            key="search-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 -z-10 bg-background"
          />
        )}
      </AnimatePresence>

      {/* Bar row — the single layout element that glides between its in-flow
          and sheet-top positions. layout="position" translates without
          scale-correcting, so the bar's contents never squish mid-flight. */}
      <motion.div
        layout="position"
        transition={{ layout: { type: 'spring', damping: 28, stiffness: 260 } }}
        className={
          isSearchActive && !rail
            ? 'w-full px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2'
            : rail ? cn('relative w-full', !pending && 'mb-4') : 'mb-4'
        }
      >
        <AnimatePresence>
          {isConverting && convertingMeta && (
            <motion.div
              key="conversion-heading"
              initial={rail ? false : { height: 0 }}
              animate={rail ? undefined : { height: 'auto' }}
              exit={rail ? undefined : { height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={rail ? 'absolute inset-x-0 bottom-full mb-5' : 'overflow-hidden'}
            >
              <ConversionHeading
                kicker={convertingMeta.kicker}
                headline={convertingMeta.headline}
                className={rail ? undefined : 'pb-5'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The beam must wrap each element DIRECTLY: the package reads its
            first child's computed corner radius (and clips to it), so an
            intermediate wrapper div makes it clip at the wrong radius. */}
        <AnimatePresence mode="wait" initial={false}>
          {!pending ? (
            <motion.div
              key="url-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <ConversionBeam active={isConverting}>
                <UrlBar variant="light" beamActive={isConverting} className="w-full" data-converting-card={isConverting || undefined}>
                  {isConverting ? (
                    <div className="flex h-full w-full flex-col items-center justify-center px-4 sm:px-6">
                      <span className="w-full truncate text-center text-sm sm:text-base font-semibold text-foreground">
                        {convertingMeta?.title ?? convertingMeta?.fallbackLabel ?? 'Music link'}
                      </span>
                      <ConversionStageLabel label={conversionStageLabel} />
                    </div>
                  ) : (
                    <input
                      ref={searchInputRef}
                      id="add-music-search-input"
                      data-testid="add-music-input"
                      value={musicUrl}
                      onChange={handleUrlChange}
                      onFocus={handleSearchFocus}
                      onPaste={handlePaste}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Search or paste your music link here"
                      aria-label="Music link or search"
                      className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                      style={{ fontSize: '16px', touchAction: 'manipulation' }}
                    />
                  )}
                </UrlBar>
              </ConversionBeam>
            </motion.div>
          ) : (
            <motion.div
              key={selectedItem ? 'selected-item' : 'pasted-link'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <ConversionBeam active={isConverting}>
              <div data-converting-card={isConverting || undefined} className={`card-ink p-4 transition-[transform,box-shadow] duration-300 ${
                isConverting
                  ? 'shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]'
                  : '-rotate-1 elev-soft'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedItem?.coverArtUrl ? (
                    <ArtworkImage
                      src={selectedItem.coverArtUrl}
                      alt={cardTitle}
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 shrink-0 rounded-md object-cover ring-1 ring-border/40"
                      fallbackClassName="size-12 shrink-0 rounded-md"
                    />
                  ) : (
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-md ${selectedItem ? 'bg-muted' : 'rounded-full bg-success/10'}`}>
                      <Music2 className={`size-5 ${selectedItem ? 'text-muted-foreground' : 'text-success-text'}`} aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-atkinson font-bold text-foreground">{cardTitle}</p>
                    {selectedItem?.artist && <p className="truncate text-sm text-muted-foreground">{selectedItem.artist}</p>}
                    {isConverting ? (
                      <ConversionStageLabel label={conversionStageLabel} className="mt-1 block" />
                    ) : selectedItem ? (
                      <StudioChip tone="positive" className="mt-1.5 capitalize">{selectedItem.type}</StudioChip>
                    ) : (
                      <p className="truncate font-mono text-sm text-muted-foreground">{musicUrl}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={isConverting}
                    aria-label={selectedItem ? 'Clear selection' : 'Clear link'}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              </ConversionBeam>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results: the sheet body on phones; open in the desktop rail until
          music is pending. popLayout lifts the closing list out of flow at
          once, so the bar row's layout spring glides the card to the
          column's vertical center while the list fades — the homepage move. */}
      {rail ? (
        <AnimatePresence mode="popLayout" initial={false}>
          {!pending && (
            <motion.div
              key="rail-results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="search-container min-h-0 overflow-hidden"
              style={{ overscrollBehavior: 'contain' }}
            >
              <SearchResults
                results={displayData}
                query={debouncedSearchTerm}
                isLoading={isLoadingCharts}
                isSearching={isSearchingMusic}
                showSearchResults={showResults}
                onSelectItem={handleSelectItem}
                onClose={closeSearch}
                SkeletonComponent={Skeleton}
                className="lg:mb-0 lg:max-w-none lg:px-0"
              />
            </motion.div>
          )}
        </AnimatePresence>
      ) : isSearchActive && (
        <motion.div
          key="search-results"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="search-container min-h-0 w-full flex-1 overflow-y-auto pb-4 pt-2"
          style={{ overscrollBehavior: 'contain' }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) closeSearch();
          }}
        >
          <SearchResults
            results={displayData}
            query={debouncedSearchTerm}
            isLoading={isLoadingCharts}
            isSearching={isSearchingMusic}
            showSearchResults={showResults}
            onSelectItem={handleSelectItem}
            onClose={closeSearch}
            chrome="flat"
            className="px-4 sm:px-4"
          />
        </motion.div>
      )}
    </div>
  );
};

const PostDetails = ({
  collapsed,
  description,
  setDescription,
  privacy,
  setPrivacy,
  handleAddToProfile,
  errorMessage,
  isConverting,
  canSubmit,
}: {
  collapsed: boolean;
  description: string;
  setDescription: (value: string) => void;
  privacy: PostPrivacy;
  setPrivacy: (value: PostPrivacy) => void;
  handleAddToProfile: () => void;
  errorMessage: string;
  isConverting: boolean;
  canSubmit: boolean;
}) => {
  return (
    <motion.div
      initial={false}
      animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden lg:!h-auto lg:!opacity-100"
    >
      <div className={`transition-opacity duration-500 ${isConverting ? 'opacity-25 pointer-events-none select-none' : ''}`}>
        <div className="card-quiet">
          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-2">
              <Label htmlFor="add-music-description">Description</Label>
              <Textarea
                id="add-music-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us how you feel about the music"
                rows={5}
                disabled={isConverting}
                className="resize-none"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <PostVisibilityControl privacy={privacy} choose={setPrivacy} disabled={isConverting} headingAs="h2" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 px-5 py-4 sm:px-6">
            <Button
              type="button"
              size="lg"
              onClick={handleAddToProfile}
              disabled={isConverting || !canSubmit}
              data-testid="add-music-submit"
              className="w-full sm:w-auto"
            >
              {isConverting ? 'Adding to your profile…' : 'Add to profile'}
            </Button>
            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
            ) : !canSubmit ? (
              <p className="text-xs text-muted-foreground">Pick your music first.</p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function AddMusicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledUrl = searchParams?.get('url') || '';
  const [returnedDraft] = useState(readReturnedAddMusicDraft);
  const returnedSelection = returnedDraft?.selection;

  const [musicUrl, setMusicUrl] = useState(returnedSelection?.title ?? returnedDraft?.link ?? prefilledUrl);
  const [description, setDescription] = useState(returnedDraft?.description ?? '');
  const [privacy, setPrivacy] = useState<PostPrivacy>(returnedDraft?.privacy ?? 'public');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(() =>
    returnedSelection ? { id: `selected-${Date.now()}`, ...returnedSelection } : null,
  );
  const [pastedLinkSource, setPastedLinkSource] = useState<string | null>(() =>
    returnedDraft && !returnedSelection ? getMusicSourceLabel(returnedDraft.link) : null,
  );
  const [errorMessage, setErrorMessage] = useState(returnedDraft?.errorMessage ?? '');
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  const [convertingMeta, setConvertingMeta] = useState<ConvertingMeta | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTrackedSearchRef = useRef<string>('');
  const runningRef = useRef<{ url: string; key: string; result: Promise<MusicLinkConversion> } | null>(null);
  const handedOffRef = useRef(false);
  const debouncedSearchTerm = useDebounce(musicUrl);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const resolvedReturnRoute = normalizeAuthRedirect(searchParams?.get('from'))
    ?? (user?.username ? `/profile/${user.username}` : null);
  const linkConversion = useMusicLinkConversion();
  const { stage: conversionStage, label: conversionStageLabel, partialResult } = useConversionStage(conversionKey);
  const isConverting = conversionKey != null;

  const handOffToPost = useEffectEvent(() => {
    const running = runningRef.current;
    if (!running) return;
    handedOffRef.current = true;
    const query = searchParams?.toString();
    holdAddMusicDraft(running.key, {
      path: query ? `/studio/music/new?${query}` : '/studio/music/new',
      link: running.url,
      selection: selectedItem
        ? {
            title: selectedItem.title,
            artist: selectedItem.artist,
            type: selectedItem.type,
            url: selectedItem.url,
            coverArtUrl: selectedItem.coverArtUrl,
          }
        : null,
      description,
      privacy,
      pushed: !resolvedReturnRoute,
    });
    const card = Array.from(document.querySelectorAll<HTMLElement>('[data-converting-card]')).find(
      (element) => element.getClientRects().length > 0,
    );
    const box = card?.getBoundingClientRect();
    handOffConversion({
      url: running.url,
      anonymous: false,
      barRect: box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null,
      running: {
        idempotencyKey: running.key,
        result: running.result,
        reported: { stageLabel: conversionStage ? conversionStageLabel : null, partialResult },
      },
    });
    const fromQuery = resolvedReturnRoute ? `&from=${encodeURIComponent(resolvedReturnRoute)}` : '';
    const target = `/post?url=${encodeURIComponent(running.url)}${fromQuery}`;
    if (resolvedReturnRoute) {
      router.replace(target);
    } else {
      router.push(target);
    }
  });
  useEffect(() => {
    if (!conversionKey) return;
    const timer = window.setTimeout(handOffToPost, HANDOFF_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [conversionKey]);
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();
  
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(
    debouncedSearchTerm.includes('http') || 
    debouncedSearchTerm.length < 2
      ? '' 
      : debouncedSearchTerm
  );
  
  const displayData = debouncedSearchTerm.length >= 2 && !debouncedSearchTerm.includes('http') 
    ? searchResultsData 
    : topCharts;

  const normalizeUrlInput = normalizeMusicLinkInput;
  const isValidMusicUrl = isSupportedMusicLink;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const query = searchParams?.toString();
      const target = query ? `/studio/music/new?${query}` : '/studio/music/new';
      router.push(`/auth/signin?redirect=${encodeURIComponent(target)}`);
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  useEffect(() => {
    if (returnedDraft) clearReturnedAddMusicDraft(returnedDraft);
  }, [returnedDraft]);

  useEffect(() => {
    if (returnedDraft) return;
    if (prefilledUrl && isSupportedMusicLink(prefilledUrl)) {
      const source = getMusicSourceLabel(prefilledUrl);
      setPastedLinkSource(source);
      setSelectedItem(null);
      setIsSearchActive(false);
      setErrorMessage('');
    }
  }, [prefilledUrl, returnedDraft]);

  // Opening is just a state flip: the same input node stays mounted (so the
  // iOS keyboard stays up) while its container becomes a full-screen sheet
  // and framer's layout animation glides the bar into place. No scrollTo,
  // no timers — the page underneath keeps its scroll position because the
  // sheet is an overlay, not a reflow.
  const handleSearchFocus = () => {
    apiService.warmupLambdas();
    if (!selectedItem && !pastedLinkSource && !isConverting) {
      setIsSearchActive(true);
    }
  };

  useEffect(() => {
    if (!isSearchActive) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('[data-search-region]')) {
        setIsSearchActive(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isSearchActive]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const normalizedValue = normalizeUrlInput(value);
    const validationError = validateMusicLink(normalizedValue);

    if (isPasteLikeInputEvent(e) && normalizedValue) {
      const detected = detectContentType(normalizedValue);

      if (validationError) {
        setMusicUrl(normalizedValue);
        setSelectedItem(null);
        setPastedLinkSource(null);
        setErrorMessage(validationError);
        setIsSearchActive(false);
        void captureClientEvent('unsupported_music_link_pasted', {
          route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
          source_surface: 'add_music',
          source_domain: sanitizeDomain(normalizedValue),
          source_platform: detected.platform,
          element_type_guess: detected.type,
          is_authenticated: true,
        });
        return;
      }

      if (isValidMusicUrl(normalizedValue)) {
        commitMusicLinkInput(normalizedValue);
        void captureClientEvent('music_link_pasted', {
          route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
          source_surface: 'add_music',
          source_domain: sanitizeDomain(normalizedValue),
          source_platform: detected.platform,
          element_type_guess: detected.type,
          is_authenticated: true,
        });
        return;
      }
    }

    setMusicUrl(value);

    if (selectedItem || pastedLinkSource) {
      setSelectedItem(null);
      setPastedLinkSource(null);
    }

    if (value.trim() && !isSearchActive) {
      setIsSearchActive(true);
    }
  };

  const commitMusicLinkInput = (rawUrl: string) => {
    const normalizedUrl = normalizeUrlInput(rawUrl);
    const source = getMusicSourceLabel(normalizedUrl);

    setMusicUrl(normalizedUrl);
    setSelectedItem(null);
    setPastedLinkSource(source);
    setErrorMessage('');
    setIsSearchActive(false);
    searchInputRef.current?.blur();
    playLinkRecognized();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    apiService.warmupLambdas();
    const pastedText = normalizeUrlInput(e.clipboardData.getData('text'));
    if (!pastedText) {
      return;
    }

    e.preventDefault();
    const detected = detectContentType(pastedText);
    const validationError = validateMusicLink(pastedText);

    if (validationError) {
      setMusicUrl(pastedText);
      setSelectedItem(null);
      setPastedLinkSource(null);
      setErrorMessage(validationError);
      setIsSearchActive(false);
      playErrorTone();

      void captureClientEvent('unsupported_music_link_pasted', {
        route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
      return;
    }
    
    if (isValidMusicUrl(pastedText)) {
      commitMusicLinkInput(pastedText);
      void captureClientEvent('music_link_pasted', {
        route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
    } else {
      void captureClientEvent('unsupported_music_link_pasted', {
        route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }

    if (e.key !== 'Enter' || !musicUrl.trim()) {
      return;
    }

    const normalizedUrl = normalizeUrlInput(musicUrl);
    const validationError = validateMusicLink(normalizedUrl);
    if (validationError) {
      setErrorMessage(validationError);
      playErrorTone();
      return;
    }

    if (!isValidMusicUrl(normalizedUrl)) {
      return;
    }

    commitMusicLinkInput(normalizedUrl);
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    if (!selectedItem && !pastedLinkSource) {
      setMusicUrl('');
    }
    searchInputRef.current?.blur();
  };

  const handleSelectItem = (url: string, title: string, type: string) => {
    const detected = detectContentType(url);
    void captureClientEvent('search_result_selected', {
      route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(url),
      is_authenticated: true,
    });
    
    let artist = '';
    let coverArtUrl = '';
    
    if (displayData) {
      const allItems = [
        ...(displayData.tracks || []),
        ...(displayData.albums || []),
        ...(displayData.artists || []),
        ...(displayData.playlists || [])
      ];
      
      const matchingItem = allItems.find(item => {
        const itemUrl = item.externalUrls?.spotify || 
                       item.externalUrls?.appleMusic || 
                       item.externalUrls?.deezer;
        const itemTitle = 'name' in item ? item.name : item.title;
        return itemUrl === url || itemTitle === title;
      });
      
      if (matchingItem) {
        if ('name' in matchingItem) {
          artist = matchingItem.name;
        } else if ('owner' in matchingItem) {
          artist = matchingItem.owner;
        } else if ('artist' in matchingItem) {
          artist = matchingItem.artist;
        }
        coverArtUrl = matchingItem.artwork || '';
      }
    }
    
    const newSelectedItem: SelectedItem = {
      id: `selected-${Date.now()}`,
      title,
      artist,
      type: type.toLowerCase(),
      url,
      coverArtUrl
    };
    
    setSelectedItem(newSelectedItem);
    setMusicUrl(title);
    setIsSearchActive(false);
    setPastedLinkSource(null);
    setErrorMessage('');
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setPastedLinkSource(null);
    setMusicUrl('');
    setErrorMessage('');
  };

  const handleAddToProfile = useCallback(async () => {
    if (conversionKey) return;
    setErrorMessage('');

    let urlToConvert = '';

    if (selectedItem) {
      urlToConvert = normalizeUrlInput(selectedItem.url);
    } else if (musicUrl.trim()) {
      urlToConvert = normalizeUrlInput(musicUrl);
      const validationError = validateMusicLink(urlToConvert);
      if (validationError || !isValidMusicUrl(urlToConvert)) {
        setErrorMessage(
          validationError ||
            "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.",
        );
        return;
      }
    } else {
      setErrorMessage('Please enter a music link or search for a song');
      return;
    }
    
    const detected = detectContentType(urlToConvert);
    void captureClientEvent('conversion_entry_started', {
      route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(urlToConvert),
      is_authenticated: true,
    });

    const platformLabel = PLATFORM_LABELS[detected.platform];
    const typeLabel = selectedItem?.type?.toLowerCase() ?? (detected.id ? detected.type : null);
    setConvertingMeta({
      title: selectedItem?.title,
      artist: selectedItem?.artist || undefined,
      artwork: selectedItem?.coverArtUrl || undefined,
      kicker: selectedItem
        ? ['Converting', typeLabel].filter(Boolean).join(' ')
        : ['Converting', platformLabel, typeLabel].filter(Boolean).join(' '),
      fallbackLabel: platformLabel ? `${platformLabel} link` : 'Music link',
      headline: pickConvertingHeadline(),
    });

    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random()}`;
    setConversionKey(key);

    router.prefetch('/post');
    const conversion = linkConversion.mutateAsync({
      url: urlToConvert,
      description: description.trim() || undefined,
      idempotencyKey: key,
      privacy,
    });
    runningRef.current = { url: urlToConvert, key, result: conversion };

    try {
      const result = await conversion;
      if (handedOffRef.current) return;
      runningRef.current = null;

      router.prefetch(`/post/${result.postId}`);
      if (result.postId) {
        const post = await ignoreFailure(apiService.fetchPostById(result.postId));
        if (post?.success) {
          savePrefetchedPost(result.postId, post);
        }
      }

      const fromQuery = resolvedReturnRoute ? `?from=${encodeURIComponent(resolvedReturnRoute)}` : '';
      const target = `/post/${result.postId}${fromQuery}`;
      if (resolvedReturnRoute) {
        router.replace(target);
      } else {
        router.push(target);
      }
    } catch (error) {
      if (handedOffRef.current) return;
      runningRef.current = null;
      setConversionKey(null);
      setConvertingMeta(null);
      playErrorTone();
      setErrorMessage(getUserFacingApiErrorMessage(
        error,
        'Something went wrong while converting your link. Please try again.',
      ));
    }
  }, [conversionKey, description, isValidMusicUrl, linkConversion, musicUrl, normalizeUrlInput, privacy, resolvedReturnRoute, router, selectedItem]);

  useEffect(() => {
    const query = debouncedSearchTerm.trim();
    if (!query || query.length < 2 || query.includes('http')) {
      return;
    }

    if (lastTrackedSearchRef.current === query.toLowerCase()) {
      return;
    }

    lastTrackedSearchRef.current = query.toLowerCase();
    const resultCount = (searchResultsData?.tracks?.length || 0) +
      (searchResultsData?.albums?.length || 0) +
      (searchResultsData?.artists?.length || 0) +
      (searchResultsData?.playlists?.length || 0);

    void captureClientEvent('search_submitted', {
      route: LEGACY_ADD_MUSIC_ANALYTICS_ROUTE,
      source_surface: 'add_music',
      result_count: resultCount,
      is_authenticated: true,
    });
  }, [debouncedSearchTerm, searchResultsData]);

  if (authLoading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return null;
  }


  const pickerProps = {
    isSearchActive,
    selectedItem,
    pastedLinkSource,
    musicUrl,
    debouncedSearchTerm,
    handleUrlChange,
    handleSearchFocus,
    handlePaste,
    handleInputKeyDown,
    clearSelection,
    searchInputRef,
    displayData,
    isLoadingCharts,
    isSearchingMusic,
    handleSelectItem,
    closeSearch,
    isConverting,
    convertingMeta,
    conversionStageLabel,
  };
  const detailsProps = {
    description,
    setDescription,
    privacy,
    setPrivacy,
    handleAddToProfile,
    errorMessage,
    isConverting,
    canSubmit: Boolean(selectedItem) || musicUrl.trim().length > 0,
  };
  const dimmed = isConverting ? 'opacity-25 pointer-events-none select-none' : '';
  const paper = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    />
  );

  const returnView = studioViewOfPath(resolvedReturnRoute?.split(/[?#]/)[0] ?? null);
  const backLabel = returnView ? studioLabels[returnView] : 'Back';

  return (
    <>
      <div className="lg:hidden">
        <div className="studio-surface relative min-h-svh bg-background">
          {paper}
          {/* The search sheet lives inside this wrapper, so while it's open
              the wrapper must rise above the fixed global navbar (z-50) — a
              child's z-index can't escape its ancestor's stacking context. */}
          <div className={`relative min-h-svh ${isSearchActive ? 'z-[60]' : 'z-10'}`}>
            <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
              <div className={`transition-opacity duration-500 ${dimmed}`}>
                <div className="flex items-center justify-between py-5">
                  <BackButton fallbackRoute={resolvedReturnRoute ?? '/'} label={backLabel} />
                </div>
                <h1 className="mb-5 font-teko text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
                  Add music
                </h1>
              </div>
              <MusicPicker {...pickerProps} />
              <PostDetails collapsed={isSearchActive} {...detailsProps} />
            </div>
          </div>
        </div>
      </div>

      <div className="studio-surface relative hidden min-h-full lg:block lg:px-8 lg:py-8">
        {paper}
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <header className={`transition-opacity duration-500 ${dimmed}`}>
            <BackButton fallbackRoute={resolvedReturnRoute ?? '/'} label={backLabel} />
            <h1 className="mt-5 font-teko text-5xl font-bold uppercase leading-none tracking-tight text-foreground">Add music</h1>
          </header>
          <div className="mt-8 grid grid-cols-2 items-start gap-x-8 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-x-16">
            <div className={`transition-opacity duration-500 ${dimmed}`}>
              <PostDetails collapsed={false} {...detailsProps} />
            </div>
            <MusicPicker {...pickerProps} rail />
          </div>
        </div>
      </div>
    </>
  );
}
