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
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
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

type SelectedItem = {
  id: string;
  title: string;
  artist: string;
  type: string;
  url: string;
  coverArtUrl: string;
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
  handleSearchBlur,
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
  searchBarOpacity,
  isConverting,
}: {
  isSearchActive: boolean;
  selectedItem: SelectedItem | null;
  pastedLinkSource: string | null;
  musicUrl: string;
  debouncedSearchTerm: string;
  handleUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchFocus: () => void;
  handleSearchBlur: () => void;
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
  searchBarOpacity: number;
  isConverting: boolean;
}) => (
  <>
    {/* Search/Input Section */}
    <div className={isSearchActive ? "fixed top-16 left-0 right-0 z-40 bg-background px-4 pt-3 pb-2 shadow-sm lg:static lg:z-auto lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-4 lg:shadow-none" : "mb-4 sm:mb-6 md:mb-8"} style={{ opacity: searchBarOpacity, transition: 'opacity 120ms ease-out' }}>
      {!isSearchActive && (
        <p className="text-center text-muted-foreground mb-6 text-sm sm:text-base lg:hidden">
          Search or paste a link below to add music to your profile
        </p>
      )}

        <div className={isSearchActive ? "" : "mb-6"}>
          {!isSearchActive && (
            <label htmlFor="add-music-search-input" className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Music link or search
            </label>
          )}

          {!selectedItem && !pastedLinkSource && (
            <UrlBar variant="light" className="w-full">
              <input
                ref={searchInputRef}
                id="add-music-search-input"
                data-testid="add-music-input"
                value={musicUrl}
                onChange={handleUrlChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onPaste={handlePaste}
                onKeyDown={handleInputKeyDown}
                disabled={isConverting}
                placeholder="Search or paste your music link here"
                className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-sm sm:text-base disabled:opacity-70"
                style={{ fontSize: '16px', touchAction: 'manipulation' }}
              />
            </UrlBar>
          )}
          
          {/* Selected Item Display */}
          {selectedItem && (
            <div className="mt-4 p-4 rounded-lg border bg-card border-border elev-2">
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
                  <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    {selectedItem.type}
                  </span>
                </div>
                <button onClick={clearSelection} disabled={isConverting} aria-label="Clear selection" className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40">
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Pasted Link Display */}
          {pastedLinkSource && !selectedItem && (
            <div className="mt-4 p-4 rounded-lg border bg-card border-border elev-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 bg-success/10 rounded-full flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-success-text" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-atkinson font-bold text-foreground">{pastedLinkSource} link pasted</p>
                  <p className="text-muted-foreground text-sm truncate font-mono">{musicUrl}</p>
                </div>
                <button onClick={clearSelection} disabled={isConverting} aria-label="Clear link" className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40">
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description Field */}
        {!isSearchActive && (
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
        )}

        {/* Add to Profile Button */}
        {!isSearchActive && (
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
        )}
      </div>

    {/* Search Results Container */}
    {isSearchActive && (
      <div key="search-results" className="search-container w-full fixed top-[8.5rem] left-0 right-0 bottom-0 z-40 overflow-y-auto bg-background lg:static lg:z-auto lg:overflow-visible lg:bg-transparent animate-in fade-in slide-in-from-bottom-5 duration-200">
        <SearchResults
          results={displayData}
          query={debouncedSearchTerm}
          isLoading={isLoadingCharts}
          isSearching={isSearchingMusic}
          showSearchResults={musicUrl.length >= 2 && !musicUrl.includes('http')}
          onSelectItem={handleSelectItem}
          onClose={closeSearch}
        />
      </div>
    )}
  </>
);

export default function AddMusicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledUrl = searchParams?.get('url') || '';
  
  const [musicUrl, setMusicUrl] = useState(prefilledUrl);
  const [description, setDescription] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchBarOpacity, setSearchBarOpacity] = useState(1);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [pastedLinkSource, setPastedLinkSource] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  // Idempotency key of the in-flight conversion; doubles as the "converting" flag.
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  // What's being converted, for the takeover overlay copy.
  const [convertingMeta, setConvertingMeta] = useState<{
    title?: string;
    artist?: string;
    artwork?: string;
    kicker: string;
    fallbackLabel: string;
    headline: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTrackedSearchRef = useRef<string>('');
  const debouncedSearchTerm = useDebounce(musicUrl, 500); // 500ms debounce for search
  
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

  const handleSearchFocus = () => {
    if (!selectedItem && !pastedLinkSource) {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      if (isDesktop) {
        setIsSearchActive(true);
        return;
      }
      // Mobile: fade out, reposition while invisible, then fade in
      setSearchBarOpacity(0);
      setTimeout(() => {
        setIsSearchActive(true);
        setSearchBarOpacity(1);
        window.scrollTo(0, 0);
      }, 120);
    }
  };

  const handleSearchBlur = () => {
    // Delay the blur to allow click events to fire
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      const isWithinSearch = activeElement?.closest('.search-container');
      
      if (!isWithinSearch && !musicUrl.trim()) {
        setIsSearchActive(false);
      }
    }, 200);
  };

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
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong while converting your link. Please try again.',
      );
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
      {/* Conversion takeover: everything yields to a centered beamed card
          narrating what's converting + the live Bridge stage. */}
      <AnimatePresence>
        {isConverting && (
          <motion.div
            key="add-music-converting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-xl text-center"
            >
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                {convertingMeta?.kicker ?? 'Converting'}
              </p>
              <p className="mb-6 font-teko text-2xl sm:text-3xl font-bold uppercase tracking-wide leading-none text-foreground">
                {convertingMeta?.headline ?? 'Building your universal link'}
              </p>
              <ConversionBeam active borderRadius={12}>
                <div className="rounded-xl border border-border/70 bg-card px-5 py-4 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-4">
                    {convertingMeta?.artwork ? (
                      <Image
                        src={convertingMeta.artwork}
                        alt=""
                        width={56}
                        height={56}
                        className="rounded-md ring-1 ring-border/40"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Music2 className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-atkinson font-bold text-foreground">
                        {convertingMeta?.title ?? convertingMeta?.fallbackLabel ?? 'Music link'}
                      </p>
                      {convertingMeta?.artist && (
                        <p className="truncate text-sm text-muted-foreground">{convertingMeta.artist}</p>
                      )}
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={conversionStageLabel}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="mt-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
                          aria-live="polite"
                        >
                          {conversionStageLabel}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </ConversionBeam>
              {description.trim() && (
                <p className="mx-auto mt-4 max-w-md text-sm italic text-muted-foreground line-clamp-2">
                  &ldquo;{description.trim()}&rdquo;
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

          <div className="relative z-10 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">

              {/* Header - hide when search active */}
              {!isSearchActive && (
                <div className="flex items-center justify-between py-6">
                  <BackButton fallbackRoute="/" label="Back" />
                </div>
              )}

              {/* Profile Section - hide when search active */}
              {!isSearchActive && (
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
              )}

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
                  handleSearchBlur={handleSearchBlur}
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
                  searchBarOpacity={searchBarOpacity}
                  isConverting={isConverting}
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
          <div className="text-center mb-8">
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
              handleSearchBlur={handleSearchBlur}
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
              searchBarOpacity={searchBarOpacity}
              isConverting={isConverting}
            />
          </div>
        </div>
      </div>
    </>
  );
}
