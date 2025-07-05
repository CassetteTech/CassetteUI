import React from 'react';
import Image from 'next/image';
import { UIText } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Track, Album, Artist, Playlist } from '@/types';

interface SearchResultsProps {
  results?: {
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  };
  isLoading: boolean;
  isSearching: boolean;
  showSearchResults: boolean;
  onSelectItem: (url: string, title: string, type: string) => void;
  onClose: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  isSearching,
  showSearchResults,
  onSelectItem,
  onClose,
}) => {
  // Combine all results into a single array with type information
  const allResults = React.useMemo(() => {
    if (!results) return [];
    
    const items: Array<{
      id: string;
      title: string;
      artist?: string;
      type: 'track' | 'album' | 'artist' | 'playlist';
      artwork: string;
      externalUrls?: {
        spotify?: string;
        appleMusic?: string;
        deezer?: string;
      };
    }> = [];

    // Add tracks
    results.tracks.forEach(track => {
      items.push({
        id: track.id,
        title: track.title,
        artist: track.artist,
        type: 'track',
        artwork: track.artwork,
        externalUrls: track.externalUrls,
      });
    });

    // Add albums
    results.albums.forEach(album => {
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
    results.artists.forEach(artist => {
      items.push({
        id: artist.id,
        title: artist.name,
        type: 'artist',
        artwork: artist.artwork,
        externalUrls: artist.externalUrls,
      });
    });

    // Add playlists
    results.playlists.forEach(playlist => {
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
  }, [results]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'track':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'album':
        return 'bg-orange-100/20 text-orange-600 border-orange-300/30';
      case 'artist':
        return 'bg-purple-100/20 text-purple-600 border-purple-300/30';
      case 'playlist':
        return 'bg-green-100/20 text-green-600 border-green-300/30';
      default:
        return 'bg-gray-100/20 text-gray-600 border-gray-300/30';
    }
  };

  const handleItemClick = (item: typeof allResults[0]) => {
    // Try to find a valid URL from the item
    const url = item.externalUrls?.spotify || 
                item.externalUrls?.appleMusic || 
                item.externalUrls?.deezer;
    
    if (url) {
      const typeDisplay = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      onSelectItem(url, item.title, typeDisplay);
    } else {
      console.error('No valid URL found for this item');
    }
  };

  if (isLoading || isSearching) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <UIText className="text-text-secondary">
          {isSearching ? 'Searching...' : 'Loading top charts...'}
        </UIText>
      </div>
    );
  }

  if (!results || allResults.length === 0) {
    return (
      <div className="text-center py-8">
        <UIText className="text-text-secondary">No results found</UIText>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-4 mb-8 animate-in fade-in duration-300">
      {/* Search Results Container with retro shadow effect */}
      <div className="relative">
        {/* Bottom shadow layer */}
        <div className="absolute inset-0 translate-x-1 translate-y-1 bg-gray-400 rounded-lg" />
        
        {/* Main container */}
        <div className="relative bg-white rounded-lg border-2 border-black">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
            <h3 className="text-lg font-bold text-text-primary font-atkinson">
              {showSearchResults ? 'Search Results' : 'Top Charts'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close search results"
            >
              <svg 
                className="w-5 h-5 text-text-primary" 
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
          <div className="max-h-[400px] overflow-y-auto">
            {allResults.map((item, index) => (
              <div
                key={`${item.type}-${item.id}-${index}`}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleItemClick(item)}
              >
                {/* Album Art */}
                <div className="flex-shrink-0 relative w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                  {item.artwork ? (
                    <Image
                      src={item.artwork}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="object-cover"
                      onError={(e) => {
                        console.error('🖼️ Image load error:', {
                          src: item.artwork,
                          title: item.title,
                          error: e
                        });
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <svg 
                        className="w-6 h-6 text-gray-400" 
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
                  <p className="font-semibold text-text-primary truncate text-sm">
                    {item.title}
                  </p>
                  {item.artist && (
                    <p className="text-text-secondary text-xs truncate">
                      {item.artist}
                    </p>
                  )}
                  <Badge 
                    className={`mt-1 text-[10px] font-bold uppercase ${getTypeColor(item.type)}`}
                  >
                    {item.type}
                  </Badge>
                </div>

                {/* Arrow */}
                <svg 
                  className="w-4 h-4 text-gray-400 flex-shrink-0" 
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