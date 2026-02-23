'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatedPrimaryButton } from '@/components/ui/animated-button';
import { UrlBar } from '@/components/ui/url-bar';
import { UIText } from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { useTopCharts, useMusicSearch } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchResults } from '@/components/features/search-results';
import { MusicSearchResult } from '@/types';
import { PageLoader } from '@/components/ui/page-loader';
import Image from 'next/image';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { detectContentType } from '@/utils/content-type-detection';
import { sanitizeDomain } from '@/lib/analytics/sanitize';

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
  isValidMusicUrl,
  router,
  searchBarOpacity
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
  isValidMusicUrl: (text: string) => boolean;
  router: ReturnType<typeof useRouter>;
  searchBarOpacity: number;
}) => (
  <>
    {/* Search/Input Section */}
    <div className={isSearchActive ? "fixed top-16 left-0 right-0 z-40 bg-background px-4 pt-3 pb-2 shadow-sm lg:static lg:z-auto lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-4 lg:shadow-none" : "mb-4 sm:mb-6 md:mb-8"} style={{ opacity: searchBarOpacity, transition: 'opacity 120ms ease-out' }}>
      {!isSearchActive && (
        <UIText className="text-center text-foreground font-atkinson font-bold mb-6 text-sm sm:text-base">
          Search or paste a link below to add music to your profile
        </UIText>
      )}

        <div className={isSearchActive ? "" : "mb-6"}>
          {!isSearchActive && (
            <label className="block text-foreground font-atkinson font-bold mb-3 text-sm">
              Music link or search
            </label>
          )}
          
          {!selectedItem && !pastedLinkSource && (
            <UrlBar variant="light" className="w-full">
              <input
                ref={searchInputRef}
                value={musicUrl}
                onChange={handleUrlChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && musicUrl.trim()) {
                    if (isValidMusicUrl(musicUrl)) {
                      // Navigate immediately to post page when pressing Enter with a link
                      const params = new URLSearchParams({
                        url: musicUrl,
                        fromAddMusic: 'true'
                      });
                      
                      if (description.trim()) {
                        params.append('description', description.trim());
                      }
                      
                      router.push(`/post?${params.toString()}`);
                    }
                    // For search queries, the search will happen via the debounced value
                  }
                }}
                placeholder="Search or paste your music link here"
                className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                style={{ fontSize: '16px', touchAction: 'manipulation' }}
              />
            </UrlBar>
          )}
          
          {/* Selected Item Display */}
          {selectedItem && (
            <div className="mt-4 p-4 bg-card rounded-lg border-2 border-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
              <div className="flex items-center gap-3">
                {selectedItem.coverArtUrl ? (
                  <Image
                    src={selectedItem.coverArtUrl}
                    alt={selectedItem.title}
                    width={48}
                    height={48}
                    className="rounded-md"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-atkinson font-bold text-foreground">{selectedItem.title}</p>
                  {selectedItem.artist && <p className="text-foreground text-sm">{selectedItem.artist}</p>}
                  <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded uppercase">
                    {selectedItem.type}
                  </span>
                </div>
                <button onClick={clearSelection} className="p-1 hover:bg-muted rounded">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Pasted Link Display */}
          {pastedLinkSource && !selectedItem && (
            <div className="mt-4 p-4 bg-card rounded-lg border-2 border-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-atkinson font-bold text-foreground">{pastedLinkSource} link pasted</p>
                  <p className="text-muted-foreground text-sm truncate">{musicUrl}</p>
                </div>
                <button onClick={clearSelection} className="p-1 hover:bg-muted rounded">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Description Field */}
        {!isSearchActive && (
          <div className="mb-4 sm:mb-6 md:mb-8">
          <label className="block text-foreground font-atkinson font-bold mb-3 text-sm">
            Description
          </label>
          <div className="relative">
            <div className="absolute inset-0 translate-x-1 translate-y-1 bg-muted-foreground rounded-lg" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Let us know a little bit about this song or playlist!"
              rows={6}
              className="relative w-full p-4 bg-card border-2 border-foreground rounded-lg font-atkinson text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </div>
        )}

        {/* Add to Profile Button */}
        {!isSearchActive && (
          <div className="text-center">
          <AnimatedPrimaryButton
            text="Add to Profile"
            onClick={handleAddToProfile}
            disabled={!selectedItem && !musicUrl.trim()}
            height={52}
            width={280}
            initialPos={6}
            className="mx-auto shadow-[0_14px_32px_rgba(210,53,53,0.35)]"
            textStyle="text-lg font-bold tracking-wide font-atkinson"
          />
          
          {errorMessage && (
            <p className="mt-4 text-danger font-atkinson text-sm">{errorMessage}</p>
          )}
        </div>
        )}
      </div>

    {/* Search Results Container */}
    {isSearchActive && (
      <div key="search-results" className="search-container w-full fixed top-[8.5rem] left-0 right-0 bottom-0 z-40 overflow-y-auto bg-background lg:static lg:z-auto lg:overflow-visible lg:bg-transparent animate-in fade-in slide-in-from-bottom-5 duration-500">
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
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTrackedSearchRef = useRef<string>('');
  const debouncedSearchTerm = useDebounce(musicUrl, 500); // 500ms debounce for search
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
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

  // Check if text is a valid music URL
  const isValidMusicUrl = (text: string) => {
    const lowerText = text.toLowerCase();
    return lowerText.includes('spotify.com') ||
           lowerText.includes('apple.com/music') ||
           lowerText.includes('music.apple.com') ||
           lowerText.includes('deezer.com');
  };

  // Handle URL paste detection
  const handleUrlPaste = (url: string) => {
    console.log('🔗 Handling URL paste:', url);
    
    let source = 'unknown';
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('spotify.com')) {
      source = 'Spotify';
    } else if (lowerUrl.includes('apple.com/music') || lowerUrl.includes('music.apple.com')) {
      source = 'Apple Music';
    } else if (lowerUrl.includes('deezer.com')) {
      source = 'Deezer';
    }
    
    setPastedLinkSource(source);
    setSelectedItem(null);
    setIsSearchActive(false);
    setErrorMessage('');
  };

  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin?redirect=/add-music');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle prefilled URL on mount
  useEffect(() => {
    if (prefilledUrl && isValidMusicUrl(prefilledUrl)) {
      handleUrlPaste(prefilledUrl);
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const detected = detectContentType(pastedText);
    
    if (isValidMusicUrl(pastedText)) {
      void captureClientEvent('music_link_pasted', {
        route: '/add-music',
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });

      // Navigate immediately to post page when pasting a link
      const params = new URLSearchParams({
        url: pastedText,
        fromAddMusic: 'true'
      });
      
      if (description.trim()) {
        params.append('description', description.trim());
      }
      
      router.push(`/post?${params.toString()}`);
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

  const closeSearch = () => {
    setIsSearchActive(false);
    if (!selectedItem && !pastedLinkSource) {
      setMusicUrl('');
    }
    searchInputRef.current?.blur();
  };

  const handleSelectItem = (url: string, title: string, type: string) => {
    console.log('🎵 handleSelectItem called with:', { url, title, type });
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

  const handleAddToProfile = () => {
    setErrorMessage('');
    
    let urlToConvert = '';
    let itemDetails = undefined;
    
    if (selectedItem) {
      urlToConvert = selectedItem.url;
      itemDetails = {
        title: selectedItem.title,
        artist: selectedItem.artist,
        type: selectedItem.type,
        coverArtUrl: selectedItem.coverArtUrl
      };
    } else if (musicUrl.trim()) {
      urlToConvert = musicUrl.trim();
    } else {
      setErrorMessage('Please enter a music link or search for a song');
      return;
    }
    
    console.log('🎯 Adding music to profile:', { urlToConvert, description, itemDetails });
    const detected = detectContentType(urlToConvert);
    void captureClientEvent('conversion_entry_started', {
      route: '/add-music',
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(urlToConvert),
      is_authenticated: true,
    });
    
    // Navigate immediately to post page with skeleton loading
    // Pass the URL and description as query parameters
    const params = new URLSearchParams({
      url: urlToConvert,
      fromAddMusic: 'true'
    });
    
    if (description.trim()) {
      params.append('description', description.trim());
    }
    
    if (itemDetails) {
      params.append('itemDetails', JSON.stringify(itemDetails));
    }
    
    router.push(`/post?${params.toString()}`);
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
        <div className="min-h-screen relative">
          {/* Animated Background */}
          <AnimatedBackground className="fixed inset-0 z-0" />

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
              <div className="flex items-center justify-center gap-3 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
                {user?.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={user.username}
                    width={60}
                    height={60}
                    className="rounded-full border-2 border-foreground/20"
                  />
                ) : (
                  <div className="w-15 h-15 rounded-full bg-foreground/10 border-2 border-foreground/20 flex items-center justify-center">
                    <span className="text-foreground text-2xl font-atkinson font-bold">
                      {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-atkinson font-bold text-foreground">
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
                  isValidMusicUrl={isValidMusicUrl}
                  router={router}
                  searchBarOpacity={searchBarOpacity}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - content only (sidebar handled by parent layout) */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:overflow-hidden p-6">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Add Music</h1>
            <p className="text-muted-foreground">Search or paste a link to add music to your profile</p>
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
              isValidMusicUrl={isValidMusicUrl}
              router={router}
              searchBarOpacity={searchBarOpacity}
            />
          </div>
        </div>
      </div>
    </>
  );
}
