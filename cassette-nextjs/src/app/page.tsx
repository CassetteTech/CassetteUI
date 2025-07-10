'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatedButton } from '@/components/ui/animated-button';
import { UrlBar } from '@/components/ui/url-bar';
import { UIText } from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { useTopCharts, useMusicSearch } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { theme } from '@/lib/theme';
import { SearchResults } from '@/components/features/search-results';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { InvertedProfileDemo } from '@/components/demo/inverted-profile-demo';

export default function HomePage() {
  const router = useRouter();
  const [musicUrl, setMusicUrl] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Animation states
  const [logoVisible, setLogoVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const displayData = debouncedSearchTerm.length > 2 && !debouncedSearchTerm.includes('http') 
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

  const handleConvertLink = (url: string) => {
    console.log('🔄 handleConvertLink called with URL:', url);
    if (!url.trim()) {
      console.log('❌ URL is empty, returning');
      return;
    }
    
    // Navigate immediately to the post page with the URL
    // The post page will show skeleton and handle the conversion
    console.log('🚀 Navigating to post page with URL:', url);
    router.push(`/post?url=${encodeURIComponent(url)}`);
  };

  const handleSearchFocus = () => {
    setIsSearchActive(true);
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

    // Ensure search is active when typing
    if (value.trim() && !isSearchActive) {
      setIsSearchActive(true);
    }
  };

  // Handle paste event for auto-conversion
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if it's a music link for auto-conversion
    const linkLower = pastedText.toLowerCase();
    const isSupported = linkLower.includes('spotify.com') || 
                       linkLower.includes('apple.com/music') || 
                       linkLower.includes('music.apple.com') || 
                       linkLower.includes('deezer.com');

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
    
    // Navigate immediately to post page
    handleConvertLink(url);
  };


  // Calculate animation classes
  const logoClasses = `transition-[opacity,transform] ${isInitialLoad ? 'duration-[1100ms]' : 'duration-[500ms]'} ease-out ${
    logoVisible 
      ? (isSearchActive ? 'opacity-0 transform -translate-y-8 lg:opacity-100 lg:transform-none' : 'opacity-100 transform translate-y-0')
      : 'opacity-0 transform translate-y-16'
  }`;

  const taglineClasses = `transition-all duration-1000 ease-out ${
    taglineVisible && !isSearchActive ? 'opacity-100' : 'opacity-0 lg:opacity-100'
  }`;

  const searchBarClasses = `transition-all duration-500 ease-out ${
    searchBarVisible 
      ? (isSearchActive 
          ? 'transform -translate-y-[calc(50vh-18rem)] sm:-translate-y-[calc(50vh-10rem)] md:-translate-y-64 lg:transform-none' 
          : 'transform translate-y-0')
      : 'opacity-0 transform translate-y-8'
  }`;

  const bottomContentClasses = `transition-all duration-1000 ease-out ${
    bottomVisible && !isSearchActive ? 'opacity-100' : 'opacity-0'
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
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative lg:min-h-screen lg:max-w-[1600px] lg:mx-auto lg:block lg:pr-[500px] lg:p-0">
            
            {/* Left Column - Logo and Profile Demo */}
            <div className="w-full lg:flex lg:flex-col lg:items-center lg:justify-start lg:px-12">
              {/* Logo Section */}
              <div className={`${logoClasses} w-full lg:min-h-screen lg:flex lg:flex-col lg:justify-center`}>
              <div className="text-center mb-6 sm:mb-8 lg:text-center lg:mb-0 lg:-mt-[25px]">
                <Image
                  src="/images/cassette_words_logo.png"
                  alt="Cassette"
                  width={750}
                  height={750}
                  className="mx-auto w-[85%] h-auto mb-3 sm:mb-5 lg:mx-auto lg:w-[600px]"
                  priority
                />
                
                {/* Tagline */}
                <div className={taglineClasses}>
                  <div className="max-w-2xl mx-auto px-6 sm:px-8 md:px-10 lg:mx-auto lg:px-0 lg:max-w-[600px]">
                    <UIText className="text-center text-foreground font-bold leading-relaxed text-xs sm:text-sm md:text-base lg:text-xl lg:text-center">
                      Express yourself through your favorite songs and playlists - wherever you stream them
                    </UIText>
                  </div>
                </div>
              </div>
            </div>

              {/* Profile Demo Section - Below Logo - Desktop only */}
              <div className={`${bottomContentClasses} w-full lg:mt-[2vh] lg:pt-32 hidden lg:block`}>
                <InvertedProfileDemo />
              </div>
            </div>

            {/* Search Bar Section - Right Column */}
            <div className={`${searchBarClasses} w-full lg:fixed lg:top-0 lg:right-[max(calc((100vw-1600px)/2),0px)] lg:h-screen lg:w-[500px] lg:flex lg:flex-col lg:px-12 lg:pt-24 lg:z-10`}>
              <div className="w-[85vw] mx-auto mb-6 sm:mb-8 lg:w-full lg:mb-4">
                <div className="relative">
                  <UrlBar 
                    variant="light"
                    className="w-full"
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
                          // Check if it's a link
                          if (musicUrl.includes('http')) {
                            handleConvertLink(musicUrl);
                          }
                          // Otherwise, the search will happen via the debounced value
                        }
                      }}
                      placeholder="Search or paste your music link here..."
                      className="w-full h-full bg-transparent border-none outline-none text-center text-brandBlack placeholder:text-textHint px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                    />
                  </UrlBar>
                </div>
              </div>

              {/* Search Results Container - Desktop only in right column */}
              <div className={`hidden lg:block search-container transition-all duration-500 ease-out w-full opacity-100 flex-1 overflow-y-auto pb-8`}>
                <SearchResults
                  results={displayData}
                  isLoading={isLoadingCharts}
                  isSearching={isSearchingMusic}
                  showSearchResults={musicUrl.length > 2 && !musicUrl.includes('http')}
                  onSelectItem={handleSelectItem}
                  onClose={closeSearch}
                  SkeletonComponent={Skeleton}
                />
              </div>
            </div>

            {/* Search Results Container - Mobile/Tablet positioning */}
            <div className={`lg:hidden search-container transition-all duration-500 ease-out w-full ${
              isSearchActive 
                ? 'opacity-100 transform -translate-y-[calc(50vh-18rem)] sm:-translate-y-[calc(50vh-10rem)] md:-translate-y-64' 
                : 'opacity-0 transform translate-y-0 pointer-events-none h-0 overflow-hidden'
            }`}>
              <SearchResults
                results={displayData}
                isLoading={isLoadingCharts}
                isSearching={isSearchingMusic}
                showSearchResults={musicUrl.length > 2 && !musicUrl.includes('http')}
                onSelectItem={handleSelectItem}
                onClose={closeSearch}
                SkeletonComponent={Skeleton}
              />
            </div>

            {/* Profile Demo Section - Mobile only */}
            <div className={`${bottomContentClasses} w-full mt-32 pt-16 lg:hidden`}>
              <InvertedProfileDemo />
            </div>

            {/* CTA Button - Mobile only */}
            {!isAuthenticated && (
              <div className={`${bottomContentClasses} ${!isSearchActive ? 'mt-8' : 'mt-8'} lg:hidden`}>
                <div className="text-center px-4 w-full">
                  <div className="mb-12 sm:mb-16">
                    <AnimatedButton
                      text="Create Your Free Account!"
                      onClick={() => window.location.href = '/auth/signup'}
                      height={48}
                      width={280}
                      initialPos={6}
                      colorTop={theme.colors.btnConvertTop}
                      colorBottom={theme.colors.btnConvertBottom}
                      borderColorTop={theme.colors.btnConvertBorder}
                      borderColorBottom={theme.colors.btnConvertBorder}
                      className="mx-auto"
                      textStyle="text-lg sm:text-xl font-bold tracking-wide font-atkinson text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Remove loading state - handled in post page now */}

          </div>

          {/* CTA Button - Desktop only */}
          {!isAuthenticated && (
            <div className={`${bottomContentClasses} hidden lg:block pl-12 mt-16`}>
              <AnimatedButton
                text="Create Your Free Account!"
                onClick={() => window.location.href = '/auth/signup'}
                height={48}
                width={280}
                initialPos={6}
                colorTop={theme.colors.btnConvertTop}
                colorBottom={theme.colors.btnConvertBottom}
                borderColorTop={theme.colors.btnConvertBorder}
                borderColorBottom={theme.colors.btnConvertBorder}
                textStyle="text-lg sm:text-xl font-bold tracking-wide font-atkinson text-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}