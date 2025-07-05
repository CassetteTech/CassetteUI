'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatedButton } from '@/components/ui/animated-button';
import { MainContainer } from '@/components/ui/container';
import { UrlBar } from '@/components/ui/url-bar';
import { 
  BodyText, 
  HeadlineText,
  UIText
} from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Badge } from '@/components/ui/badge';
import { useMusicLinkConversion, useTopCharts, useMusicSearch } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { MusicLinkConversion } from '@/types';
import { SearchResults } from '@/components/features/search-results';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [musicUrl, setMusicUrl] = useState('');
  const [conversionResult, setConversionResult] = useState<MusicLinkConversion | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLinkConversion, setIsLinkConversion] = useState(false);
  const [autoConvertTimer, setAutoConvertTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Animation states
  const [logoVisible, setLogoVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchTerm = useDebounce(musicUrl, 300); // 300ms debounce for better responsiveness
  
  const { isAuthenticated } = useAuthState();
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion();
  
  // Add the music search hook
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(
    // Only search if it's not a link and has sufficient length
    debouncedSearchTerm.includes('http') || debouncedSearchTerm.length < 2 ? '' : debouncedSearchTerm
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
      { delay: 1800, action: () => setTaglineVisible(true) },
      // Search bar appears (65% of timeline)
      { delay: 3900, action: () => setSearchBarVisible(true) },
      // Bottom graphics (75% of timeline)
      { delay: 4500, action: () => setBottomVisible(true) },
    ];

    const timeouts = timeline.map(({ delay, action }) => 
      setTimeout(action, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleConvertLink = (url: string) => {
    if (!url.trim()) return;
    
    setIsLinkConversion(true);
    setIsSearchActive(false);
    
    convertLink(url, {
      onSuccess: (result) => {
        // Navigate to the post page with the conversion result
        router.push(`/post?data=${encodeURIComponent(JSON.stringify(result))}`);
      },
      onError: (error) => {
        console.error('Conversion failed:', error);
        setIsLinkConversion(false);
        setIsSearchActive(true);
        // Show error toast or message
      },
    });
  };

  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };

  const handleSearchBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the new focus target is within the search results
    const relatedTarget = e.relatedTarget as HTMLElement;
    const isWithinSearch = relatedTarget?.closest('.search-container');
    
    if (!isWithinSearch && !musicUrl.trim()) {
      setIsSearchActive(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMusicUrl(value);
    
    if (conversionResult) {
      setConversionResult(null);
    }

    // Ensure search is active when typing
    if (value.trim() && !isSearchActive) {
      setIsSearchActive(true);
    }
  };

  // Handle paste event for auto-conversion
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Clear any existing timer
    if (autoConvertTimer) {
      clearTimeout(autoConvertTimer);
    }

    // Check if it's a music link for auto-conversion
    const linkLower = pastedText.toLowerCase();
    const isSupported = linkLower.includes('spotify.com') || 
                       linkLower.includes('apple.com/music') || 
                       linkLower.includes('music.apple.com') || 
                       linkLower.includes('deezer.com');

    if (isSupported && !isConverting && !isSearchingMusic) {
      // Animate back to center for link conversion
      setIsSearchActive(false);
      setIsLinkConversion(true);
      searchInputRef.current?.blur();
      
      const timer = setTimeout(() => {
        handleConvertLink(pastedText);
      }, 300);
      
      setAutoConvertTimer(timer);
    }
  };

  const closeSearch = () => {
    if (autoConvertTimer) {
      clearTimeout(autoConvertTimer);
    }
    setIsSearchActive(false);
    setMusicUrl('');
    searchInputRef.current?.blur();
  };

  // Handle selecting an item from search results
  const handleSelectItem = (url: string, title: string, type: string) => {
    setMusicUrl(`Converting ${type} - ${title}...`);
    searchInputRef.current?.blur();
    handleConvertLink(url);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoConvertTimer) {
        clearTimeout(autoConvertTimer);
      }
    };
  }, [autoConvertTimer]);

  // Calculate animation classes
  const logoClasses = `transition-all duration-1000 ease-out ${
    logoVisible 
      ? (isSearchActive ? 'opacity-0 transform -translate-y-8' : 'opacity-100 transform translate-y-0')
      : 'opacity-0 transform translate-y-16'
  }`;

  const taglineClasses = `transition-all duration-500 delay-200 ease-out ${
    taglineVisible && !isSearchActive ? 'opacity-100' : 'opacity-0'
  }`;

  const searchBarClasses = `transition-all duration-300 ease-out ${
    searchBarVisible 
      ? (isSearchActive && !isLinkConversion 
          ? 'transform -translate-y-[calc(50vh-18rem)] sm:-translate-y-[calc(50vh-10rem)] md:-translate-y-64 lg:-translate-y-80' 
          : 'transform translate-y-0')
      : 'opacity-0 transform translate-y-8'
  }`;

  const bottomContentClasses = `transition-all duration-700 ease-out ${
    bottomVisible && !isSearchActive ? 'opacity-100' : 'opacity-0'
  }`;

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <AnimatedBackground className="fixed inset-0 z-0" />
      
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top spacing */}
          <div className="h-16"></div>

          {/* Main Content Container */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative">
            
            {/* Logo Section */}
            <div className={logoClasses}>
              <div className="text-center mb-6 sm:mb-8">
                <Image
                  src="/images/cassette_words_logo.png"
                  alt="Cassette"
                  width={750}
                  height={750}
                  className="mx-auto w-[85%] h-auto mb-3 sm:mb-5"
                  priority
                />
                
                {/* Tagline */}
                <div className={taglineClasses}>
                  <div className="max-w-2xl mx-auto px-6 sm:px-8 md:px-10">
                    <UIText className="text-center text-text-primary font-bold leading-relaxed text-xs sm:text-sm md:text-base lg:text-lg">
                      Express yourself through your favorite songs and playlists - wherever you stream them
                    </UIText>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar Section */}
            <div className={searchBarClasses}>
              <div className="w-[85vw] mx-auto mb-6 sm:mb-8">
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
                      className="w-full h-full bg-transparent border-none outline-none text-center text-[#1F2327] placeholder-gray-500 px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                    />
                  </UrlBar>
                </div>
              </div>
            </div>

            {/* Search Results Container */}
            {isSearchActive && !isLinkConversion && (
              <div className="search-container transition-all duration-300 ease-out transform -translate-y-[calc(50vh-18rem)] sm:-translate-y-[calc(50vh-10rem)] md:-translate-y-64 lg:-translate-y-80 w-full">
                <SearchResults
                  results={displayData}
                  isLoading={isLoadingCharts}
                  isSearching={isSearchingMusic}
                  showSearchResults={musicUrl.length > 2 && !musicUrl.includes('http')}
                  onSelectItem={handleSelectItem}
                  onClose={closeSearch}
                />
              </div>
            )}

            {/* Conversion Result */}
            {conversionResult && (
              <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 md:px-4 mb-8 animate-in fade-in duration-500">
                <MainContainer className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4 mb-6">
                    <Image
                      src={conversionResult.metadata.artwork}
                      alt={conversionResult.metadata.title}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover w-14 h-14 sm:w-16 sm:h-16"
                    />
                    <div className="flex-1 min-w-0">
                      <HeadlineText className="truncate text-lg sm:text-xl md:text-2xl">{conversionResult.metadata.title}</HeadlineText>
                      <BodyText className="text-text-secondary truncate text-sm sm:text-base">{conversionResult.metadata.artist}</BodyText>
                      <Badge className="mt-2 bg-primary text-white font-atkinson font-bold text-xs sm:text-sm">
                        {conversionResult.metadata.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                    {conversionResult.convertedUrls.spotify && (
                      <AnimatedButton
                        text="Spotify"
                        onClick={() => window.open(conversionResult.convertedUrls.spotify, '_blank')}
                        height={36}
                        width={100}
                        initialPos={3}
                      />
                    )}
                    {conversionResult.convertedUrls.appleMusic && (
                      <AnimatedButton
                        text="Apple Music"
                        onClick={() => window.open(conversionResult.convertedUrls.appleMusic, '_blank')}
                        height={36}
                        width={120}
                        initialPos={3}
                      />
                    )}
                    {conversionResult.convertedUrls.deezer && (
                      <AnimatedButton
                        text="Deezer"
                        onClick={() => window.open(conversionResult.convertedUrls.deezer, '_blank')}
                        height={36}
                        width={100}
                        initialPos={3}
                      />
                    )}
                  </div>
                </MainContainer>
              </div>
            )}

            {/* Bottom Graphics and CTA */}
            <div className={bottomContentClasses}>
              <div className="text-center px-4 w-full">
                <div className="mb-8 sm:mb-12 max-w-4xl mx-auto">
                  <Image
                    src="/images/home_graphics.png"
                    alt="Music graphics"
                    width={800}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
                
                {!isAuthenticated && (
                  <div className="mb-12 sm:mb-16">
                    <AnimatedButton
                      text="Create Your Free Account!"
                      onClick={() => window.location.href = '/auth/signup'}
                      height={48}
                      width={280}
                      initialPos={6}
                      colorTop="#1F2327"
                      colorBottom="#595C5E"
                      borderColorTop="#1F2327"
                      borderColorBottom="#1F2327"
                      className="mx-auto"
                      textStyle="text-lg sm:text-xl font-bold tracking-wide font-atkinson text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Loading State */}
            {(isLinkConversion && isConverting) && (
              <div className="fixed inset-0 bg-cream/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
                  <UIText className="text-text-primary font-bold">
                    Converting your link...
                  </UIText>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}