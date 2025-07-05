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
import Image from 'next/image';

export default function HomePage() {
  const [musicUrl, setMusicUrl] = useState('');
  const [conversionResult, setConversionResult] = useState<MusicLinkConversion | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [, setIsSearchFocused] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkConversion, setIsLinkConversion] = useState(false);
  
  // Animation states
  const [logoVisible, setLogoVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchTerm = useDebounce(musicUrl, 500); // 500ms debounce
  
  const { isAuthenticated } = useAuthState();
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion();
  
  // Add the music search hook
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(
    // Only search if it's not a link and has sufficient length
    debouncedSearchTerm.includes('http') ? '' : debouncedSearchTerm
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

  const handleConvertLink = () => {
    if (!musicUrl.trim()) return;
    
    setIsLoading(true);
    setIsLinkConversion(true);
    
    convertLink(musicUrl, {
      onSuccess: (result) => {
        setConversionResult(result);
        setIsLoading(false);
        setIsLinkConversion(false);
      },
      onError: (error) => {
        console.error('Conversion failed:', error);
        setIsLoading(false);
        setIsLinkConversion(false);
      },
    });
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setIsSearchActive(true);
    setShowSearchResults(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    if (!musicUrl.trim()) {
      setIsSearchActive(false);
      setShowSearchResults(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMusicUrl(value);
    
    if (conversionResult) {
      setConversionResult(null);
    }

    // Check if it's a music link for auto-conversion
    const linkLower = value.toLowerCase();
    const isSupported = linkLower.includes('spotify.com') || 
                       linkLower.includes('apple.com/music') || 
                       linkLower.includes('music.apple.com') || 
                       linkLower.includes('deezer.com');

    if (isSupported && !isLoading) {
      // Animate back to center for link conversion
      setIsSearchActive(false);
      setShowSearchResults(false);
      setIsLinkConversion(true);
      
      setTimeout(() => {
        handleConvertLink();
      }, 300);
    }
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setShowSearchResults(false);
    setMusicUrl('');
    searchInputRef.current?.blur();
  };

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
      ? (isSearchActive ? 'transform -translate-y-24 md:-translate-y-32 lg:-translate-y-40' : 'transform translate-y-0')
      : 'opacity-0 transform translate-y-8'
  }`;

  const bottomContentClasses = `transition-all duration-700 ease-out ${
    bottomVisible && !showSearchResults && !isLinkConversion ? 'opacity-100' : 'opacity-0'
  }`;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground className="fixed inset-0 z-0" />
      
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top spacing */}
          <div className="h-16"></div>

          {/* Main Content Container */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
            
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
                      placeholder="Search or paste your music link here..."
                      className="w-full h-full bg-transparent border-none outline-none text-center text-[#1F2327] placeholder-gray-500 px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                    />
                  </UrlBar>
                </div>
              </div>
            </div>

            {/* Search Results Container */}
            {showSearchResults && (
              <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-4 mb-8 animate-in fade-in duration-300">
                <MainContainer className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <HeadlineText className="text-primary text-lg sm:text-xl md:text-2xl">Search Results</HeadlineText>
                    <button
                      onClick={closeSearch}
                      className="text-text-secondary hover:text-text-primary transition-colors p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="border-t border-text-hint/30 pt-4">
                    {(isLoadingCharts || isSearchingMusic) ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <UIText>{isSearchingMusic ? 'Searching...' : 'Loading...'}</UIText>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {displayData?.tracks.slice(0, 12).map((track) => (
                          <div 
                            key={track.id} 
                            className="flex items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 rounded-lg hover:bg-cream/50 transition-colors cursor-pointer"
                            onClick={() => {
                              // Find a valid URL from the track object
                              const trackUrl = track.externalUrls?.spotify || 
                                               track.externalUrls?.appleMusic || 
                                               track.externalUrls?.deezer;
                              
                              if (trackUrl) {
                                setMusicUrl(`Converting ${track.title}...`);
                                setIsSearchActive(false);
                                setShowSearchResults(false);
                                setIsLinkConversion(true);
                                
                                // Use the convertLink mutation after a short delay
                                setTimeout(() => {
                                  convertLink(trackUrl, {
                                    onSuccess: (result) => {
                                      setConversionResult(result);
                                      setIsLoading(false);
                                      setIsLinkConversion(false);
                                      setMusicUrl('');
                                    },
                                    onError: (error) => {
                                      console.error('Conversion failed:', error);
                                      setIsLoading(false);
                                      setIsLinkConversion(false);
                                      setMusicUrl('');
                                    },
                                  });
                                }, 300);
                              } else {
                                console.error('No convertible URL found for this track.');
                              }
                            }}
                          >
                            <Image
                              src={track.artwork}
                              alt={track.title}
                              width={48}
                              height={48}
                              className="rounded-lg object-cover border border-text-hint/20 w-10 h-10 sm:w-12 sm:h-12"
                            />
                            <div className="flex-1 min-w-0">
                              <UIText className="font-bold text-text-primary truncate text-sm sm:text-base">{track.title}</UIText>
                              <UIText className="text-text-secondary text-xs sm:text-sm truncate">{track.artist}</UIText>
                              <div className="inline-block mt-1">
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-atkinson font-bold text-xs">
                                  TRACK
                                </Badge>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </MainContainer>
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
            {(isLoading || isConverting) && (
              <div className="fixed inset-0 bg-cream/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
                  <UIText className="text-text-primary font-bold">
                    {isLinkConversion ? 'Converting your link...' : 'Loading...'}
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