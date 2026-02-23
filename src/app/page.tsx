'use client';

import { useState, useEffect, useRef } from 'react';
import { UrlBar } from '@/components/ui/url-bar';
import { UIText } from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { useTopCharts, useMusicSearch } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchResults } from '@/components/features/search-results';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { HomeDemoSection } from '@/components/demo/home-demo-section';
import { AppleMusicHelpModal } from '@/components/features/apple-music-help-modal';
import { StageHoverCard } from '@/components/features/stage-hover-card';
import { motion, AnimatePresence } from 'framer-motion';
import { captureClientEvent } from '@/lib/analytics/client';
import { detectContentType } from '@/utils/content-type-detection';
import { sanitizeDomain } from '@/lib/analytics/sanitize';

export default function HomePage() {
  const router = useRouter();
  const [musicUrl, setMusicUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
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

  const validateMusicLink = (url: string): string | null => {
    try {
      if (!url.startsWith('http')) {
        // Only validate if it looks like it should be a URL
        if (url.includes('.com') || url.includes('http') || url.includes('www')) {
          return "Please enter a valid URL starting with http:// or https://";
        }
        return null;
      }
      
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // Check for private Apple Music library links
      if (hostname.includes('music.apple.com') && parsedUrl.pathname.includes('/library/')) {
        if (parsedUrl.pathname.includes('/library/playlist/')) {
          return "You've pasted a private Apple Music playlist link. Please use the 'Share Playlist' option to copy the correct link.";
        }
        return "You've pasted a private Apple Music library link. Please use the 'Share' option to copy the correct link.";
      }
      
      // Check if it's a music service but potentially unsupported
      const supportedServices = ['spotify.com', 'music.apple.com', 'deezer.com'];
      const isMusicService = supportedServices.some(service => hostname.includes(service));
      
      if (!isMusicService && (
        hostname.includes('youtube.com') || 
        hostname.includes('soundcloud.com') ||
        hostname.includes('bandcamp.com') ||
        hostname.includes('tidal.com') ||
        hostname.includes('amazon.com')
      )) {
        return "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.";
      }
      
      // Check for obviously non-music links
      if (!isMusicService && url.length > 10) {
        const commonNonMusicDomains = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'];
        if (commonNonMusicDomains.some(domain => hostname.includes(domain))) {
          return "This doesn't look like a music link or that service isn't supported yet. Please paste a link from Spotify, Apple Music, or Deezer.";
        }
      }
      
    } catch {
      // If URL parsing fails but it looks like it should be a URL
      if (url.includes('.com') || url.includes('http') || url.includes('www')) {
        return "Please enter a valid URL.";
      }
    }
    return null;
  };

  const handleConvertLink = (url: string) => {
    const trimmed = url.trim();
    console.log('🔄 handleConvertLink called with URL:', trimmed);
    if (!trimmed) {
      console.log('❌ URL is empty, returning');
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
    
    // Navigate immediately to the post page with the URL
    // The post page will show skeleton and handle the conversion
    console.log('🚀 Navigating to post page with URL:', trimmed);
    router.push(`/post?url=${encodeURIComponent(trimmed)}`);
  };

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
    setMusicUrl(value);

    // Clear any existing error first
    if (urlError) {
      setUrlError(null);
    }

    // Validate the input - check for URLs and common mistakes
    const validationError = validateMusicLink(value);
    setUrlError(validationError);

    // Ensure search is active when typing
    if (value.trim() && !isSearchActive) {
      setIsSearchActive(true);
    }
  };

  // Handle paste event for auto-conversion
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const validationError = validateMusicLink(pastedText);
    const detected = detectContentType(pastedText);

    setMusicUrl(pastedText);
    setUrlError(validationError);

    if (validationError) {
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
    const linkLower = pastedText.toLowerCase();
    const isSupported = linkLower.includes('spotify.com') || 
                       linkLower.includes('apple.com/music') || 
                       linkLower.includes('music.apple.com') || 
                       linkLower.includes('deezer.com');

    if (isSupported) {
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

    if (isSupported && !isSearchingMusic) {
      // Navigate immediately for link conversion
      handleConvertLink(pastedText);
    }
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setMusicUrl('');
    searchInputRef.current?.blur();
  };

  // Handle selecting an item from search results
  const handleSelectItem = (url: string, title: string, type: string) => {
    console.log('🎵 handleSelectItem called with:', { url, title, type });
    void captureClientEvent('search_result_selected', {
      route: '/',
      source_surface: 'home',
      element_type_guess: detectContentType(url).type,
      source_platform: detectContentType(url).platform,
      source_domain: sanitizeDomain(url),
      is_authenticated: isAuthenticated,
    });
    
    // Navigate immediately to post page
    handleConvertLink(url);
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
  const logoClasses = `transition-[opacity,transform] ${isInitialLoad ? 'duration-[1100ms]' : 'duration-[500ms]'} ease-out ${
    logoVisible 
      ? (isSearchActive ? 'opacity-0 transform -translate-y-8 lg:opacity-100 lg:transform-none' : 'opacity-100 transform translate-y-0')
      : 'opacity-0 transform translate-y-16'
  }`;

  const taglineClasses = `transition-all duration-1000 ease-out ${
    taglineVisible && !isSearchActive ? 'opacity-100' : 'opacity-0 lg:opacity-100'
  }`;

  const searchBarClasses = isSearchActive
    ? 'fixed top-16 left-0 right-0 z-40 bg-background pt-3 pb-2 shadow-sm lg:top-0 lg:bg-transparent lg:pt-0 lg:pb-0 lg:left-auto lg:shadow-none'
    : '';

  const bottomContentClasses = `transition-all duration-1000 ease-out ${
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
            
            {/* Left Column - Logo and Profile Demo */}
            <div className="w-full lg:flex lg:flex-col lg:items-center lg:justify-start lg:px-12" style={{overscrollBehavior: 'contain'}}>
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
                        alpha.
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
              className={`${searchBarClasses} w-full lg:fixed lg:top-0 lg:right-[max(calc((100vw-1600px)/2),0px)] lg:h-screen lg:w-[500px] lg:flex lg:flex-col lg:px-12 lg:pt-24 lg:z-10 lg:overflow-hidden`}
              style={{overscrollBehavior: 'contain'}}
            >
              <div className={`w-[85vw] mx-auto lg:w-full lg:mb-4 ${isSearchActive ? 'mb-2' : 'mb-6 sm:mb-8'}`}>
                <div className="relative">
                  <UrlBar 
                    variant="light"
                    className="w-full"
                    hasError={!!urlError}
                  >
                    <input
                      ref={searchInputRef}
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
                  </UrlBar>
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
              </div>

              {/* Search Results Container - Desktop only in right column */}
              <div className={`hidden lg:block search-container transition-all duration-500 ease-out w-full opacity-100 flex-1 overflow-hidden pb-8`} style={{overscrollBehavior: 'contain'}}>
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

            {/* Search Results Container - Mobile/Tablet positioning */}
            <AnimatePresence>
              {isSearchActive && (
                <motion.div
                  key="mobile-search-results"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 250, delay: 0.08 }}
                  className="lg:hidden search-container fixed top-[8.5rem] left-0 right-0 bottom-0 z-40 overflow-y-auto bg-card force-light-surface"
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
