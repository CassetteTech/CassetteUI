import React from 'react';
import Image from 'next/image';
import { UIText } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Track, Album, Artist, Playlist } from '@/types';
import { rankSearchResults, RankedItem } from '@/utils/search-ranking';
import { Spinner } from '@/components/ui/spinner';

interface SearchResultsProps {
  results?: {
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  };
  query?: string;
  isLoading: boolean;
  isSearching: boolean;
  showSearchResults: boolean;
  onSelectItem: (url: string, title: string, type: string) => void;
  onClose: () => void;
  SkeletonComponent?: React.ComponentType<{ className?: string }>;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query = '',
  isLoading,
  isSearching,
  showSearchResults,
  onSelectItem,
  onClose,
  SkeletonComponent,
}) => {
  // Combine all results into a single array with intelligent ranking
  const allResults = React.useMemo(() => {
    if (!results) return [];

    // Use smart ranking when we have a search query
    if (query && query.length > 0) {
      return rankSearchResults(results, query);
    }

    // Fallback to simple ordering for top charts (no query)
    const items: RankedItem[] = [];

    // Add tracks
    results.tracks.forEach((track) => {
      items.push({
        id: track.id,
        title: track.title,
        artist: track.artist,
        type: 'track',
        artwork: track.artwork,
        externalUrls: track.externalUrls,
        isExplicit: track.isExplicit,
      });
    });

    // Add albums
    results.albums.forEach((album) => {
      items.push({
        id: album.id,
        title: album.title,
        artist: album.artist,
        type: 'album',
        artwork: album.artwork,
        externalUrls: album.externalUrls,
      });
    });

    // Add artists
    results.artists.forEach((artist) => {
      items.push({
        id: artist.id,
        title: artist.name,
        type: 'artist',
        artwork: artist.artwork,
        externalUrls: artist.externalUrls,
      });
    });

    // Add playlists
    results.playlists.forEach((playlist) => {
      items.push({
        id: playlist.id,
        title: playlist.title,
        artist: playlist.owner,
        type: 'playlist',
        artwork: playlist.artwork,
        externalUrls: playlist.externalUrls,
      });
    });

    return items.slice(0, 50); // Limit to 50 results
  }, [results, query]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'track':
        // Use primary color for tracks
        return 'bg-primary/10 text-primary border-primary/20';
      case 'album':
        // Use warning color for albums
        return 'bg-warning/10 text-warning border-warning/20';
      case 'artist':
        return 'bg-accentRoyal/10 text-accentRoyal border-accentRoyal/20';
      case 'playlist':
        // Use success color for playlists
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-secondary/10 text-secondary-foreground border-border';
    }
  };

  const handleItemClick = (item: typeof allResults[0]) => {
    console.log('🔍 Item clicked:', item);
    console.log('🔗 External URLs:', item.externalUrls);
    
    // Try to find a valid URL from the item
    const url = item.externalUrls?.spotify || 
                item.externalUrls?.appleMusic || 
                item.externalUrls?.deezer;
    
    console.log('📎 Selected URL:', url);
    
    if (url) {
      const typeDisplay = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      console.log('✅ Calling onSelectItem with:', { url, title: item.title, type: typeDisplay });
      onSelectItem(url, item.title, typeDisplay);
    } else {
      console.error('❌ No valid URL found for this item');
      console.error('Item data:', item);
    }
  };

  if (isLoading || isSearching) {
    return (
      <div className="text-center py-8">
        <Spinner size="lg" variant="primary" className="mx-auto mb-4" />
        <UIText className="text-muted-foreground">
          {isSearching ? 'Searching...' : 'Loading top charts...'}
        </UIText>
      </div>
    );
  }

  if (!results || allResults.length === 0) {
    return (
      <div className="text-center py-8">
        <UIText className="text-muted-foreground">No results found</UIText>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 md:px-4 mb-4 sm:mb-8 animate-in fade-in duration-300">
      {/* Search Results Container with retro shadow effect */}
      <div className="relative">
        {/* Bottom shadow layer */}
        <div className="absolute inset-0 translate-x-1 translate-y-1 bg-muted-foreground rounded-lg" />

        {/* Main container */}
        <div className="relative bg-card rounded-lg border-2 border-foreground force-light-surface">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b-2 border-foreground">
            <h3 className="text-sm sm:text-lg font-bold text-foreground font-atkinson">
              {showSearchResults ? 'Search Results' : 'Top Charts'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors lg:hidden"
              aria-label="Close search results"
            >
              <svg
                className="w-5 h-5 text-foreground"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-20rem)] overflow-y-auto">
            {allResults.map((item, index) => (
              <div
                key={`${item.type}-${item.id}-${index}`}
                className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 sm:p-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  handleItemClick(item);
                }}
              >
                {/* Album Art */}
                <div className="flex-shrink-0 relative w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden border border-border">
                  {item.artwork ? (
                    <Image
                      src={item.artwork}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        console.error('🖼️ Image load error:', {
                          src: item.artwork,
                          title: item.title,
                          error: e
                        });
                      }}
                    />
                  ) : SkeletonComponent ? (
                    <SkeletonComponent className="w-10 h-10 sm:w-12 sm:h-12 rounded-md" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {item.title}
                    </p>
                    <Badge
                      className={`shrink-0 text-[9px] sm:text-[10px] font-bold uppercase leading-none px-1 py-0.5 ${getTypeColor(item.type)}`}
                    >
                      {item.type}
                    </Badge>
                  </div>
                  {item.artist && (
                    <p className="text-muted-foreground text-xs truncate">
                      {item.artist}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg
                  className="w-4 h-4 text-muted-foreground flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};