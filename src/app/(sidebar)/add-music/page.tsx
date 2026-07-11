'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UrlBar } from '@/components/ui/url-bar';
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
import Image from 'next/image';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { apiService } from '@/services/api';
import { savePrefetchedPost } from '@/lib/post-prefetch';
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

// Add Music Form component extracted to prevent recreation on every render
const AddMusicForm = ({
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
  description,
  setDescription,
  handleAddToProfile,
  errorMessage,
  searchInputRef,
  displayData,
  isLoadingCharts,
  isSearchingMusic,
  handleSelectItem,
  closeSearch,
  isConverting,
  convertingMeta,
  conversionStageLabel,
}: {
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
  description: string;
  setDescription: (value: string) => void;
  handleAddToProfile: () => void;
  errorMessage: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  displayData: MusicSearchResult | undefined;
  isLoadingCharts: boolean;
  isSearchingMusic: boolean;
  handleSelectItem: (url: string, title: string, type: string) => void;
  closeSearch: () => void;
  isConverting: boolean;
  convertingMeta: ConvertingMeta | null;
  conversionStageLabel: string;
}) => {
  // Pin the open sheet to the visual viewport: the iOS keyboard pans the
  // visual viewport, which would otherwise push the bar and the top of the
  // results out of view the moment the input focuses.
  const sheetRef = useSheetViewportPin(isSearchActive);

  return (
  <>
    {/* Search/Input Section — on mobile this container becomes a full-screen
        sheet while searching, so the input node never re-parents (the iOS
        keyboard stays up) and the bar glides to the sheet top as one element */}
    <div
      ref={sheetRef}
      data-search-region
      className={
        isSearchActive
          ? 'fixed inset-0 z-[60] flex flex-col lg:static lg:z-auto lg:block'
          : 'mb-4 sm:mb-6 md:mb-8'
      }
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Sheet backdrop — fades in under the gliding bar; fixed inside an
          untransformed ancestor so it always covers the real viewport */}
      <AnimatePresence>
        {isSearchActive && (
          <motion.div
            key="search-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 -z-10 bg-background lg:hidden"
          />
        )}
      </AnimatePresence>

      {!isSearchActive && (
        <p className="text-center text-muted-foreground mb-6 text-sm sm:text-base lg:hidden animate-in fade-in duration-300">
          Search or paste a link below to add music to your profile
        </p>
      )}

      {/* Bar row — the single layout element that glides between its in-flow
          and sheet-top positions. layout="position" translates without
          scale-correcting, so the bar's contents never squish mid-flight. */}
      <motion.div
        layout="position"
        transition={{ layout: { type: 'spring', damping: 28, stiffness: 260 } }}
        className={
          isSearchActive
            ? 'w-full px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 lg:px-0 lg:pt-0 lg:pb-4'
            : 'mb-6'
        }
      >
        {!isSearchActive && (
          <label htmlFor="add-music-search-input" className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 animate-in fade-in duration-300">
            Music link or search
          </label>
        )}

        {/* Converting: kicker + headline narrate above the beamed card */}
        <AnimatePresence>
          {isConverting && convertingMeta && (
            <ConversionHeading
              key="conversion-heading"
              kicker={convertingMeta.kicker}
              headline={convertingMeta.headline}
              className="mb-5"
            />
          )}
        </AnimatePresence>

        {/* The beam wraps whichever element holds the pending music — the
            bar, a picked search result, or a pasted link card — so the
            conversion lights up in place instead of jumping to an overlay.
            It must wrap each element DIRECTLY: the package reads its first
            child's computed corner radius (and clips to it), so an
            intermediate wrapper div makes it clip at the wrong radius. */}
        <AnimatePresence mode="wait" initial={false}>
          {!selectedItem && !pastedLinkSource ? (
            <motion.div
              key="url-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <ConversionBeam active={isConverting}>
                <UrlBar variant="light" beamActive={isConverting} className="w-full">
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
                      className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                      style={{ fontSize: '16px', touchAction: 'manipulation' }}
                    />
                  )}
                </UrlBar>
              </ConversionBeam>
            </motion.div>
          ) : selectedItem ? (
              <motion.div
                key="selected-item"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {/* Selected Item Display — swaps to beam-friendly chrome while
                    converting, mirroring UrlBar's beamActive treatment */}
                <ConversionBeam active={isConverting}>
                <div className={`p-4 rounded-lg border bg-card transition-[border-color,box-shadow] duration-300 ${
                  isConverting
                    ? 'border-border/70 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]'
                    : 'border-border elev-2'
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedItem.coverArtUrl ? (
                      <Image
                        src={selectedItem.coverArtUrl}
                        alt={selectedItem.title}
                        width={48}
                        height={48}
                        className="rounded-md ring-1 ring-border/40"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-atkinson font-bold text-foreground truncate">{selectedItem.title}</p>
                      {selectedItem.artist && <p className="text-muted-foreground text-sm truncate">{selectedItem.artist}</p>}
                      {isConverting ? (
                        <ConversionStageLabel label={conversionStageLabel} className="mt-1 block" />
                      ) : (
                        <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                          {selectedItem.type}
                        </span>
                      )}
                    </div>
                    <button onClick={clearSelection} disabled={isConverting} aria-label="Clear selection" className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40">
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                </ConversionBeam>
              </motion.div>
            ) : (
              <motion.div
                key="pasted-link"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {/* Pasted Link Display */}
                <ConversionBeam active={isConverting}>
                <div className={`p-4 rounded-lg border bg-card transition-[border-color,box-shadow] duration-300 ${
                  isConverting
                    ? 'border-border/70 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]'
                    : 'border-border elev-2'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 shrink-0 bg-success/10 rounded-full flex items-center justify-center">
                      <Music2 className="w-5 h-5 text-success-text" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-atkinson font-bold text-foreground">{pastedLinkSource} link pasted</p>
                      {isConverting ? (
                        <ConversionStageLabel label={conversionStageLabel} className="mt-1 block" />
                      ) : (
                        <p className="text-muted-foreground text-sm truncate font-mono">{musicUrl}</p>
                      )}
                    </div>
                    <button onClick={clearSelection} disabled={isConverting} aria-label="Clear link" className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40">
                      <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                </ConversionBeam>
              </motion.div>
            )}
          </AnimatePresence>
      </motion.div>

      {/* Search Results — sheet body on mobile, inline block on desktop.
          Close is carried by the backdrop fade + bar glide (an exit
          animation here would reflow mid-close). */}
      {isSearchActive && (
        <motion.div
          key="search-results"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="search-container w-full flex-1 min-h-0 overflow-y-auto pt-2 pb-4 lg:flex-none lg:overflow-visible lg:pt-0"
          style={{ overscrollBehavior: 'contain' }}
          onPointerDown={(e) => {
            // Tapping the empty area below the list dismisses, like a sheet scrim
            if (e.target === e.currentTarget) closeSearch();
          }}
        >
          <SearchResults
            results={displayData}
            query={debouncedSearchTerm}
            isLoading={isLoadingCharts}
            isSearching={isSearchingMusic}
            showSearchResults={musicUrl.length >= 2 && !musicUrl.includes('http')}
            onSelectItem={handleSelectItem}
            onClose={closeSearch}
            chrome="flat"
          />
        </motion.div>
      )}
    </div>

    {/* Description + submit collapse away while searching (the desktop
        form/results swap) and dim while converting; both stay mounted so
        the transitions are smooth instead of a hard unmount */}
    <motion.div
      initial={false}
      animate={{ height: isSearchActive ? 0 : 'auto', opacity: isSearchActive ? 0 : 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className={`transition-opacity duration-500 ${isConverting ? 'opacity-25 pointer-events-none select-none' : ''}`}>
        {/* Description Field */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <label htmlFor="add-music-description" className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Description
          </label>
          <textarea
            id="add-music-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us how you feel about the music"
            rows={6}
            disabled={isConverting}
            className="w-full rounded-lg border border-border bg-field elev-1 p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Add to Profile Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleAddToProfile}
            disabled={isConverting || (!selectedItem && !musicUrl.trim())}
            data-testid="add-music-submit"
            className="inline-flex h-12 w-full max-w-[280px] items-center justify-center rounded-md bg-primary px-8 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground elev-2 transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isConverting ? 'Adding to your profile…' : 'Add to Profile'}
          </button>

          {errorMessage && (
            <p className="mt-4 text-destructive font-atkinson text-sm">{errorMessage}</p>
          )}
        </div>
      </div>
    </motion.div>
  </>
  );
};

export default function AddMusicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledUrl = searchParams?.get('url') || '';
  
  const [musicUrl, setMusicUrl] = useState(prefilledUrl);
  const [description, setDescription] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [pastedLinkSource, setPastedLinkSource] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  // Idempotency key of the in-flight conversion; doubles as the "converting" flag.
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  // What's being converted, for the in-place beamed card copy.
  const [convertingMeta, setConvertingMeta] = useState<ConvertingMeta | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTrackedSearchRef = useRef<string>('');
  const debouncedSearchTerm = useDebounce(musicUrl, 300); // matches the home page search feel
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const resolvedReturnRoute = user?.username ? `/profile/${user.username}` : null;
  const linkConversion = useMusicLinkConversion();
  const { label: conversionStageLabel } = useConversionStage(conversionKey);
  const isConverting = conversionKey != null;
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();
  
  // Music search - only search if it's not a link and has sufficient length
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(
    debouncedSearchTerm.includes('http') || 
    debouncedSearchTerm.length < 2
      ? '' 
      : debouncedSearchTerm
  );
  
  // Decide what data to display
  const displayData = debouncedSearchTerm.length >= 2 && !debouncedSearchTerm.includes('http') 
    ? searchResultsData 
    : topCharts;

  // Keep local aliases so AddMusicForm stays simple and testable.
  const normalizeUrlInput = normalizeMusicLinkInput;
  const isValidMusicUrl = isSupportedMusicLink;

  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin?redirect=/add-music');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle prefilled URL on mount
  useEffect(() => {
    if (prefilledUrl && isSupportedMusicLink(prefilledUrl)) {
      const source = getMusicSourceLabel(prefilledUrl);
      setPastedLinkSource(source);
      setSelectedItem(null);
      setIsSearchActive(false);
      setErrorMessage('');
    }
  }, [prefilledUrl]);

  // Opening is just a state flip: the same input node stays mounted (so the
  // iOS keyboard stays up) while its container becomes a full-screen sheet
  // and framer's layout animation glides the bar into place. No scrollTo,
  // no timers — the page underneath keeps its scroll position because the
  // sheet is an overlay, not a reflow.
  const handleSearchFocus = () => {
    if (!selectedItem && !pastedLinkSource && !isConverting) {
      setIsSearchActive(true);
    }
  };

  // Desktop swaps the form for results while searching; a click outside the
  // search region swaps back. (On mobile the sheet covers the viewport, so
  // this never fires — the sheet's close button handles it.)
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
          route: '/add-music',
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
          route: '/add-music',
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

    // Clear selected item and pasted link when typing
    if (selectedItem || pastedLinkSource) {
      setSelectedItem(null);
      setPastedLinkSource(null);
    }

    // Ensure search is active when typing (but don't auto-convert URLs while typing)
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
        route: '/add-music',
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
        route: '/add-music',
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
    } else {
      void captureClientEvent('unsupported_music_link_pasted', {
        route: '/add-music',
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
      route: '/add-music',
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(url),
      is_authenticated: true,
    });
    
    // Find the full item data from search results to get artist and artwork
    let artist = '';
    let coverArtUrl = '';
    
    if (displayData) {
      // Search through all result types to find the matching item
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
          // Artist type
          artist = matchingItem.name;
        } else if ('owner' in matchingItem) {
          // Playlist type
          artist = matchingItem.owner;
        } else if ('artist' in matchingItem) {
          // Track or Album type
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
    setMusicUrl(title); // Show title in search bar
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
      route: '/add-music',
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(urlToConvert),
      is_authenticated: true,
    });

    // Convert in place: a centered takeover (beamed card + live Bridge
    // stages) carries the busy state, and we only navigate once the post is
    // ready, so the user lands directly on the finished post — no skeleton.
    const platformLabel = PLATFORM_LABELS[detected.platform];
    const typeLabel = selectedItem?.type?.toLowerCase() ?? (detected.id ? detected.type : null);
    setConvertingMeta({
      title: selectedItem?.title,
      artist: selectedItem?.artist || undefined,
      artwork: selectedItem?.coverArtUrl || undefined,
      // Search selections hide the platform — the catalog source behind
      // search is an implementation detail. Pasted links name the platform.
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

    try {
      const result = await linkConversion.mutateAsync({
        url: urlToConvert,
        description: description.trim() || undefined,
        idempotencyKey: key,
      });

      // Warm handoff: prefetch the route and stash the post payload so
      // /post/[id] renders real content immediately — no skeleton phase.
      router.prefetch(`/post/${result.postId}`);
      if (result.postId) {
        try {
          const post = await apiService.fetchPostById(result.postId);
          if (post?.success) {
            savePrefetchedPost(result.postId, post);
          }
        } catch {
          // Post page falls back to fetching with retries.
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
      setConversionKey(null);
      setConvertingMeta(null);
      playErrorTone();
      setErrorMessage(getUserFacingApiErrorMessage(
        error,
        'Something went wrong while converting your link. Please try again.',
      ));
    }
  }, [conversionKey, description, isValidMusicUrl, linkConversion, musicUrl, normalizeUrlInput, resolvedReturnRoute, router, selectedItem]);

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
      route: '/add-music',
      source_surface: 'add_music',
      result_count: resultCount,
      is_authenticated: true,
    });
  }, [debouncedSearchTerm, searchResultsData]);

  // Show loading while checking auth
  if (authLoading) {
    return <PageLoader message="Loading..." />;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }


  return (
    <>
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="min-h-screen relative bg-background">
          {/* Subtle dotted paper — same texture as Explore */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />

          {/* The search sheet lives inside this wrapper, so while it's open
              the wrapper must rise above the fixed global navbar (z-50) — a
              child's z-index can't escape its ancestor's stacking context. */}
          <div className={`relative min-h-screen ${isSearchActive ? 'z-[60]' : 'z-10'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">

              {/* Header + profile stay mounted — the search sheet covers them
                  on mobile, and they dim in place while a conversion runs */}
              <div className={`transition-opacity duration-500 ${isConverting ? 'opacity-25 pointer-events-none select-none' : ''}`}>
                <div className="flex items-center justify-between py-6">
                  <BackButton fallbackRoute="/" label="Back" />
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
                  {user?.profilePicture ? (
                    <Image
                      src={user.profilePicture}
                      alt={user.username}
                      width={60}
                      height={60}
                      className="rounded-full border-2 border-foreground/80"
                    />
                  ) : (
                    <div className="w-15 h-15 rounded-full bg-muted border-2 border-foreground/80 flex items-center justify-center">
                      <span className="text-foreground text-2xl font-atkinson font-bold">
                        {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <h1 className="font-teko text-4xl sm:text-5xl font-bold uppercase leading-none tracking-tight text-foreground">
                    Add Music
                  </h1>
                </div>
              </div>

              {/* Main Content */}
              <div className="max-w-2xl mx-auto">
                <AddMusicForm
                  isSearchActive={isSearchActive}
                  selectedItem={selectedItem}
                  pastedLinkSource={pastedLinkSource}
                  musicUrl={musicUrl}
                  debouncedSearchTerm={debouncedSearchTerm}
                  handleUrlChange={handleUrlChange}
                  handleSearchFocus={handleSearchFocus}
                  handlePaste={handlePaste}
                  handleInputKeyDown={handleInputKeyDown}
                  clearSelection={clearSelection}
                  description={description}
                  setDescription={setDescription}
                  handleAddToProfile={handleAddToProfile}
                  errorMessage={errorMessage}
                  searchInputRef={searchInputRef}
                  displayData={displayData}
                  isLoadingCharts={isLoadingCharts}
                  isSearchingMusic={isSearchingMusic}
                  handleSelectItem={handleSelectItem}
                  closeSearch={closeSearch}
                  isConverting={isConverting}
                  convertingMeta={convertingMeta}
                  conversionStageLabel={conversionStageLabel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - content only (sidebar handled by parent layout) */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:overflow-hidden p-6 relative bg-background">
        {/* Subtle dotted paper — same texture as Explore */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="flex-1 overflow-y-auto relative">
          {/* Header */}
          <div className={`text-center mb-8 transition-opacity duration-500 ${isConverting ? 'opacity-25 pointer-events-none select-none' : ''}`}>
            <h1 className="font-teko text-5xl font-bold uppercase leading-none tracking-tight text-foreground mb-2">Add Music</h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Search or paste a link to add music to your profile</p>
          </div>

          {/* Add Music Form */}
          <div className="max-w-2xl mx-auto">
            <AddMusicForm
              isSearchActive={isSearchActive}
              selectedItem={selectedItem}
              pastedLinkSource={pastedLinkSource}
              musicUrl={musicUrl}
              debouncedSearchTerm={debouncedSearchTerm}
              handleUrlChange={handleUrlChange}
              handleSearchFocus={handleSearchFocus}
              handlePaste={handlePaste}
              handleInputKeyDown={handleInputKeyDown}
              clearSelection={clearSelection}
              description={description}
              setDescription={setDescription}
              handleAddToProfile={handleAddToProfile}
              errorMessage={errorMessage}
              searchInputRef={searchInputRef}
              displayData={displayData}
              isLoadingCharts={isLoadingCharts}
              isSearchingMusic={isSearchingMusic}
              handleSelectItem={handleSelectItem}
              closeSearch={closeSearch}
              isConverting={isConverting}
              convertingMeta={convertingMeta}
              conversionStageLabel={conversionStageLabel}
            />
          </div>
        </div>
      </div>
    </>
  );
}
