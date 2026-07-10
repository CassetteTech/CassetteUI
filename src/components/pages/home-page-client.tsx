'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UrlBar } from '@/components/ui/url-bar';
import { Button } from '@/components/ui/button';
import { UIText } from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { useTopCharts, useMusicSearch, useMusicLinkConversion } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { SearchResults } from '@/components/features/search-results';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, Play } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { HomeDemoSection } from '@/components/demo/home-demo-section';
import { AppleMusicHelpModal } from '@/components/features/apple-music-help-modal';
import { StageHoverCard } from '@/components/features/stage-hover-card';
import { motion, AnimatePresence } from 'framer-motion';
import { captureClientEvent } from '@/lib/analytics/client';
import { apiService } from '@/services/api';
import { savePrefetchedPost } from '@/lib/post-prefetch';
import { playErrorTone, playLinkRecognized } from '@/lib/sounds';
import { HOMEPAGE_DEMO_VIDEO } from '@/lib/marketing-copy';
import { detectContentType } from '@/utils/content-type-detection';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { DemoVideoDialog } from '@/components/demo/demo-video-dialog';
import {
  normalizeMusicLinkInput,
  isSupportedMusicLink,
  isPasteLikeInputEvent,
  validateMusicLink,
} from '@/utils/music-link-input';
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';

export default function HomePageClient() {
  const router = useRouter();
  const [musicUrl, setMusicUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  // Idempotency key of the in-flight conversion; doubles as the "converting" flag.
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  // What's being converted, for the takeover copy: the search-result title
  // when the user picked an item, otherwise platform/type parsed from the URL.
  const [convertingMeta, setConvertingMeta] = useState<{
    title?: string;
    kicker: string;
    fallbackLabel: string;
    headline: string;
  } | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchBarOpacity, setSearchBarOpacity] = useState(1);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  // Animation states
  const [logoVisible, setLogoVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTrackedSearchRef = useRef<string>('');
  const debouncedSearchTerm = useDebounce(musicUrl, 300); // 300ms debounce for better responsiveness
  
  const { isAuthenticated } = useAuthState();
  const linkConversion = useMusicLinkConversion();
  const isConverting = conversionKey != null;
  const { label: conversionStageLabel } = useConversionStage(conversionKey, {
    anonymous: !isAuthenticated,
  });
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();
  
  // Add the music search hook
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(
    // Only search if it's not a link, not converting, and has sufficient length
    debouncedSearchTerm.includes('http') || 
    debouncedSearchTerm.includes('Converting') || 
    debouncedSearchTerm.length < 2
      ? '' 
      : debouncedSearchTerm
  );
  
  // Decide what data to display
  const displayData = debouncedSearchTerm.length >= 2 && !debouncedSearchTerm.includes('http') 
    ? searchResultsData 
    : topCharts;

  // Initial animation sequence (matching Flutter's 6-second timeline)
  useEffect(() => {
    const timeline = [
      // Logo fade in (15% delay, then 45% duration)
      { delay: 900, action: () => setLogoVisible(true) },
      // Tagline fade in (10% into logo animation)
      { delay: 1500, action: () => setTaglineVisible(true) },
      // Search bar appears earlier
      { delay: 1500, action: () => setSearchBarVisible(true) },
      // Bottom graphics appear 1s after search bar completes (2400 + 300 + 1000)
      { delay: 1575, action: () => setBottomVisible(true) },
    ];

    const timeouts = timeline.map(({ delay, action }) => 
      setTimeout(action, delay)
    );
    
    // Mark initial load as complete after all animations
    timeouts.push(setTimeout(() => setIsInitialLoad(false), 2100));

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Fade out scroll indicator once user scrolls (delayed to ignore scroll restoration)
  useEffect(() => {
    let baselineY = 0;
    const handleScroll = () => {
      if (window.scrollY - baselineY > 50) {
        setHasScrolled(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };
    const timeout = setTimeout(() => {
      baselineY = window.scrollY;
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 2200);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleConvertLink = useCallback(async (url: string, item?: { title: string; type: string }) => {
    const trimmed = normalizeMusicLinkInput(url);
    if (!trimmed || conversionKey) {
      return;
    }

    const detected = detectContentType(trimmed);
    void captureClientEvent('conversion_entry_started', {
      route: '/',
      source_surface: 'home',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(trimmed),
      is_authenticated: isAuthenticated,
    });

    const platformLabel = PLATFORM_LABELS[detected.platform];
    const typeLabel = item?.type ?? (detected.id ? detected.type : null);
    setConvertingMeta({
      title: item?.title,
      // Search selections hide the platform — the catalog source behind
      // search/top charts is an implementation detail. Pasted links name
      // the platform the user pasted from.
      kicker: item
        ? ['Converting', typeLabel].filter(Boolean).join(' ')
        : ['Converting', platformLabel, typeLabel].filter(Boolean).join(' '),
      // Pasted links have no track name to show — name the platform instead.
      fallbackLabel: platformLabel ? `${platformLabel} link` : 'Music link',
      headline: pickConvertingHeadline(),
    });

    // Convert in place: the search bar carries the activity signal (border
    // beam + live Bridge stages) and we only navigate once the post is
    // ready, so the user lands directly on the finished post.
    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random()}`;
    setUrlError(null);
    setConversionKey(key);
    setIsSearchActive(false);
    searchInputRef.current?.blur();

    try {
      const result = await linkConversion.mutateAsync({
        url: trimmed,
        idempotencyKey: key,
        anonymous: !isAuthenticated,
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
      router.push(`/post/${result.postId}`);
    } catch (error) {
      setConversionKey(null);
      setConvertingMeta(null);
      playErrorTone();
      setUrlError(
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong while converting your link. Please try again.',
      );
    }
  }, [conversionKey, isAuthenticated, linkConversion, router]);

  const handleSearchFocus = () => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      // Desktop: search bar is always fixed in right column, no reposition needed
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
  };

  const handleSearchBlur = () => {
    // Delay the blur to allow click events to fire
    setTimeout(() => {
      // Check if the new focus target is within the search results
      const activeElement = document.activeElement as HTMLElement;
      const isWithinSearch = activeElement?.closest('.search-container');
      
      if (!isWithinSearch && !musicUrl.trim()) {
        setIsSearchActive(false);
      }
    }, 200);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const normalizedValue = normalizeMusicLinkInput(value);
    const validationError = validateMusicLink(normalizedValue);

    if (isPasteLikeInputEvent(e) && normalizedValue) {
      const detected = detectContentType(normalizedValue);
      setMusicUrl(normalizedValue);
      setUrlError(validationError);

      if (validationError) {
        playErrorTone();
        void captureClientEvent('unsupported_music_link_pasted', {
          route: '/',
          source_surface: 'home',
          source_domain: sanitizeDomain(normalizedValue),
          source_platform: detected.platform,
          element_type_guess: detected.type,
          is_authenticated: isAuthenticated,
        });
        return;
      }

      if (isSupportedMusicLink(normalizedValue)) {
        playLinkRecognized();
        void captureClientEvent('music_link_pasted', {
          route: '/',
          source_surface: 'home',
          source_domain: sanitizeDomain(normalizedValue),
          source_platform: detected.platform,
          element_type_guess: detected.type,
          is_authenticated: isAuthenticated,
        });
        handleConvertLink(normalizedValue);
        return;
      }
    }

    setMusicUrl(value);

    // Clear any existing error first
    if (urlError) {
      setUrlError(null);
    }

    // Validate the input - check for URLs and common mistakes
    const nextValidationError = validateMusicLink(value);
    setUrlError(nextValidationError);

    // Ensure search is active when typing
    if (value.trim() && !isSearchActive) {
      setIsSearchActive(true);
    }
  };

  // Handle paste event for auto-conversion
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = normalizeMusicLinkInput(e.clipboardData.getData('text'));
    if (!pastedText) {
      return;
    }

    e.preventDefault();
    const validationError = validateMusicLink(pastedText);
    const detected = detectContentType(pastedText);

    setMusicUrl(pastedText);
    setUrlError(validationError);

    if (validationError) {
      playErrorTone();
      void captureClientEvent('unsupported_music_link_pasted', {
        route: '/',
        source_surface: 'home',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: isAuthenticated,
      });
      return;
    }

    // Check if it's a music link for auto-conversion
    const isSupported = isSupportedMusicLink(pastedText);

    if (isSupported) {
      playLinkRecognized();
      void captureClientEvent('music_link_pasted', {
        route: '/',
        source_surface: 'home',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: isAuthenticated,
      });
    } else {
      void captureClientEvent('unsupported_music_link_pasted', {
        route: '/',
        source_surface: 'home',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: isAuthenticated,
      });
    }

    if (isSupported) {
      // Navigate immediately for link conversion
      handleConvertLink(pastedText);
    }
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setMusicUrl('');
    searchInputRef.current?.blur();
  };

  // /?url=<music link> starts the inline beamed conversion directly — the
  // canonical "convert this link" entry point (demo links, external shares).
  // Nothing navigates to the old /post?url= skeleton page anymore.
  const searchParams = useSearchParams();
  const autoConvertHandled = useRef(false);
  useEffect(() => {
    if (autoConvertHandled.current) return;
    const prefill = searchParams?.get('url');
    if (!prefill) return;
    autoConvertHandled.current = true;
    const normalized = normalizeMusicLinkInput(prefill);
    if (!normalized || !isSupportedMusicLink(normalized)) return;
    setMusicUrl(normalized);
    void handleConvertLink(normalized);
    router.replace('/', { scroll: false });
  }, [searchParams, handleConvertLink, router]);

  // Handle selecting an item from search results
  const handleSelectItem = (url: string, title: string, type: string) => {
    void captureClientEvent('search_result_selected', {
      route: '/',
      source_surface: 'home',
      element_type_guess: detectContentType(url).type,
      source_platform: detectContentType(url).platform,
      source_domain: sanitizeDomain(url),
      is_authenticated: isAuthenticated,
    });

    // Convert in place; the bar shows the picked item while the beam runs.
    handleConvertLink(url, { title, type: type.toLowerCase() });
  };

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
      route: '/',
      source_surface: 'home',
      result_count: resultCount,
      is_authenticated: isAuthenticated,
    });
  }, [debouncedSearchTerm, searchResultsData, isAuthenticated]);


  // Calculate animation classes
  const logoClasses = `transition-[opacity,transform] ${isInitialLoad ? 'duration-1100' : 'duration-300'} ease-out ${
    logoVisible 
      ? (isSearchActive ? 'opacity-0 transform -translate-y-8 lg:opacity-100 lg:transform-none' : 'opacity-100 transform translate-y-0')
      : 'opacity-0 transform translate-y-16'
  }`;

  const taglineClasses = `transition-opacity duration-1000 ease-out ${
    taglineVisible && !isSearchActive ? 'opacity-100' : 'opacity-0 lg:opacity-100'
  }`;

  const searchBarClasses = isSearchActive
    ? 'fixed top-16 left-0 right-0 z-40 bg-background pt-3 pb-2 shadow-sm lg:top-0 lg:bg-transparent lg:pt-0 lg:pb-0 lg:left-auto lg:shadow-none'
    : '';

  const bottomContentClasses = `transition-opacity duration-1000 ease-out ${
    bottomVisible && !isSearchActive ? 'opacity-100' : 'opacity-0 lg:opacity-100'
  }`;

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <AnimatedBackground className="fixed inset-0 z-0" />
      
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-0 lg:max-w-none">
          
          {/* Top spacing */}
          <div className="h-16 lg:h-0"></div>

          {/* Main Content Container */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative lg:max-w-[1600px] lg:mx-auto lg:block lg:pr-[500px] lg:p-0">
            
            {/* Left Column - Logo and Profile Demo (dimmed while a conversion runs) */}
            <div
              className={`w-full lg:flex lg:flex-col lg:items-center lg:justify-start lg:px-12 transition-opacity duration-500 ${
                isConverting ? 'opacity-25 pointer-events-none select-none' : 'opacity-100'
              }`}
              style={{overscrollBehavior: 'contain'}}
            >
              {/* Logo Section */}
              <div className={`${logoClasses} relative w-full lg:min-h-[calc(100vh-4rem)] lg:flex lg:flex-col lg:items-center`}>
              {/* Top spacer — pushes content to center */}
              <div className="hidden lg:block lg:flex-1" />

              <div className="text-center mb-6 sm:mb-8 lg:text-center lg:mb-0 lg:-mt-[25px]">
                {/* Logo + alpha layout (stacked on mobile, inline on desktop) */}
                <div className="flex w-[85%] lg:w-[600px] mx-auto mb-3 sm:mb-5 flex-col items-center lg:flex-row lg:items-end">
                  <div className="w-full lg:flex-1 lg:min-w-0 -mb-[clamp(1.5rem,6vw,3.5rem)] lg:mb-0">
                    <Image
                      src="/images/cassette_words_logo.png"
                      alt="Cassette"
                      width={2612}
                      height={1123}
                      className="block h-auto w-full"
                      priority
                    />
                  </div>
                  <div className="mt-0 shrink-0 lg:mt-0 lg:-ml-3 lg:mb-[8%]">
                    <StageHoverCard>
                      <span className="font-teko font-black text-base sm:text-lg lg:text-xl tracking-wide [-webkit-text-fill-color:#FFFFFF] [-webkit-text-stroke:3.5px_#3B3E41] [paint-order:stroke_fill] cursor-pointer">
                        beta.
                      </span>
                    </StageHoverCard>
                  </div>
                </div>

                {/* Tagline */}
                <div className={taglineClasses}>
                  <div className="max-w-2xl mx-auto px-6 sm:px-8 md:px-10 lg:mx-auto lg:px-0 lg:max-w-[600px]">
                    <UIText className="text-center text-foreground font-bold leading-relaxed text-xs sm:text-sm md:text-base lg:text-xl lg:text-center">
                      Express yourself through your favorite songs and playlists - wherever you stream them
                    </UIText>
                    <div className="mt-5 flex justify-center">
                      <DemoVideoDialog
                        title={HOMEPAGE_DEMO_VIDEO.title}
                        videoSrc={HOMEPAGE_DEMO_VIDEO.videoSrc}
                        videoType={HOMEPAGE_DEMO_VIDEO.videoType}
                        caption={HOMEPAGE_DEMO_VIDEO.caption}
                        trigger={
                          <Button type="button" variant="brutalist" className="gap-2 px-4 py-2 h-auto">
                            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            Watch demo
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom spacer keeps logo/tagline vertically balanced */}
              <div className="hidden lg:block lg:flex-1" />

              {/* Scroll indicator pinned to hero bottom */}
              <div className="pointer-events-none hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                <div className={`flex flex-col items-center gap-1 transition-opacity duration-500 ${!isInitialLoad && !hasScrolled ? 'opacity-70' : 'opacity-0'}`}>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-foreground font-semibold">Scroll</span>
                  <div className="animate-bounce">
                    <ChevronDown className="w-4 h-4 text-foreground" />
                  </div>
                </div>
              </div>
            </div>

              {/* Demo Section - Below Logo - Desktop only */}
              <div className={`${bottomContentClasses} w-full lg:mt-[2vh] lg:pt-16 pb-32 hidden lg:block`}>
                <HomeDemoSection isAuthenticated={isAuthenticated} />
              </div>
            </div>

            {/* Search Bar Section - Right Column */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: searchBarVisible ? searchBarOpacity : 0, y: searchBarVisible ? 0 : 32 }}
              transition={{
                layout: { type: 'spring', damping: 28, stiffness: 260 },
                opacity: { duration: 0.12, ease: 'easeOut' },
                y: { duration: 0.5, ease: 'easeOut' },
              }}
              className={`${searchBarClasses} w-full lg:fixed lg:top-0 lg:right-[max(calc((100vw-1600px)/2),0px)] lg:h-screen lg:w-[500px] lg:flex lg:flex-col lg:px-12 lg:z-10 lg:overflow-hidden ${
                isConverting ? 'lg:justify-center lg:pt-0' : 'lg:pt-24'
              }`}
              style={{overscrollBehavior: 'contain'}}
            >
              <motion.div
                layout
                transition={{ layout: { type: 'spring', damping: 26, stiffness: 220 } }}
                className={`${
                  isConverting
                    ? 'fixed inset-0 z-50 flex flex-col justify-center px-6 lg:static lg:z-auto lg:block lg:px-0'
                    : ''
                } w-[85vw] mx-auto lg:w-full lg:mb-4 ${isSearchActive ? 'mb-2' : 'mb-6 sm:mb-8'}`}
              >
                <AnimatePresence>
                  {isConverting && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="mb-5 text-center"
                    >
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                        {convertingMeta?.kicker ?? 'Converting'}
                      </p>
                      <p className="font-teko text-2xl sm:text-3xl font-bold uppercase tracking-wide text-foreground leading-none">
                        {convertingMeta?.headline ?? 'Building your universal link'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="relative">
                  <ConversionBeam active={isConverting}>
                  <UrlBar
                    variant="light"
                    className="w-full"
                    hasError={!!urlError}
                    beamActive={isConverting}
                  >
                    {isConverting ? (
                      /* While the beam runs, the bar narrates: what's
                         converting on top, the live Bridge stage below. */
                      <div className="flex h-full w-full flex-col items-center justify-center px-4 sm:px-6">
                        <span className="w-full truncate text-center text-sm sm:text-base font-semibold text-foreground">
                          {convertingMeta?.title ?? convertingMeta?.fallbackLabel ?? 'Music link'}
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={conversionStageLabel}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
                            aria-live="polite"
                          >
                            {conversionStageLabel}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    ) : (
                      <input
                        ref={searchInputRef}
                        data-testid="home-search-input"
                        value={musicUrl}
                        onChange={handleUrlChange}
                        onFocus={handleSearchFocus}
                        onBlur={handleSearchBlur}
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && musicUrl.trim()) {
                            const validationError = validateMusicLink(musicUrl);
                            setUrlError(validationError);
                            if (validationError) {
                              return;
                            }
                            // Check if it's a link
                            if (musicUrl.includes('http')) {
                              handleConvertLink(musicUrl.trim());
                            }
                            // Otherwise, the search will happen via the debounced value
                          }
                        }}
                        placeholder="Search or paste your music link here..."
                        className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-base"
                        style={{ fontSize: '16px', touchAction: 'manipulation' }}
                      />
                    )}
                  </UrlBar>
                  </ConversionBeam>
                  {urlError && (
                    <p className="text-destructive text-sm mt-2 text-center px-4 font-semibold">
                      {urlError}{' '}
                      <button 
                        onClick={() => setIsHelpModalOpen(true)} 
                        className="underline hover:text-destructive/80 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 rounded"
                      >
                        Show me how.
                      </button>
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Search Results Container - Desktop only in right column.
                  Removed from flow while converting so the bar can center. */}
              <div className={`${isConverting ? 'lg:hidden' : 'lg:block'} hidden search-container transition-opacity duration-300 ease-out w-full opacity-100 flex-1 overflow-hidden pb-8`} style={{overscrollBehavior: 'contain'}}>
                <SearchResults
                  results={displayData}
                  query={debouncedSearchTerm}
                  isLoading={isLoadingCharts}
                  isSearching={isSearchingMusic}
                  showSearchResults={musicUrl.length >= 2 && !musicUrl.includes('http')}
                  onSelectItem={handleSelectItem}
                  onClose={closeSearch}
                  SkeletonComponent={Skeleton}
                />
              </div>
            </motion.div>

            {/* Conversion takeover scrim - covers marketing content on mobile
                while the centered bar + beam carry the loading state */}
            <AnimatePresence>
              {isConverting && (
                <motion.div
                  key="conversion-scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="lg:hidden fixed inset-0 z-40 bg-background/90 backdrop-blur-sm"
                />
              )}
            </AnimatePresence>

            {/* Search Results Container - Mobile/Tablet positioning */}
            <AnimatePresence>
              {isSearchActive && !isConverting && (
                <motion.div
                  key="mobile-search-results"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 250, delay: 0.08 }}
                  className="lg:hidden search-container fixed top-[8.5rem] left-0 right-0 bottom-0 z-40 overflow-y-auto bg-background"
                >
                  <SearchResults
                    results={displayData}
                    query={debouncedSearchTerm}
                    isLoading={isLoadingCharts}
                    isSearching={isSearchingMusic}
                    showSearchResults={musicUrl.length >= 2 && !musicUrl.includes('http')}
                    onSelectItem={handleSelectItem}
                    onClose={closeSearch}
                    SkeletonComponent={Skeleton}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Demo Section - Mobile only */}
            <div className={`${bottomContentClasses} w-full mt-12 sm:mt-20 pt-8 sm:pt-16 pb-24 sm:pb-32 lg:hidden`}>
              <HomeDemoSection isAuthenticated={isAuthenticated} />
            </div>

            {/* Remove loading state - handled in post page now */}

          </div>

        </div>
      </div>

      {/* Apple Music Help Modal */}
      <AppleMusicHelpModal 
        open={isHelpModalOpen} 
        onOpenChange={setIsHelpModalOpen} 
      />
    </div>
  );
}
