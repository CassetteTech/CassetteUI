'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { CollectionGrid, CollectionItemData } from '@/components/features/collection/collection-grid';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { Spinner } from '@/components/ui/spinner';
import { BackButton } from '@/components/ui/back-button';

// Sample collection items from the Flutter collection_items.dart
const collectionItems: CollectionItemData[] = [
  {
    type: "Song",
    title: "Best Part",
    artist: "Daniel Caesar",
    album: "Freudian",
    duration: "3:29",
    description: "One of my favorite songs off of Daniel Caesar's magnum opus",
    username: "matttoppi"
  },
  {
    type: "Album",
    title: "CHROMAKOPIA",
    artist: "Tyler the Creator",
    songCount: 14,
    duration: "1h",
    description: "Tyler's latest masterpiece",
    username: "matttoppi"
  },
  {
    type: "Playlist",
    title: "Waves",
    songCount: 25,
    duration: "1h 30m",
    description: "My favorite summer vibes playlist",
    username: "matttoppi"
  }
];

export default function CollectionsPage() {
  const router = useRouter();
  const { mutate: convertLink } = useMusicLinkConversion();
  const [isConverting, setIsConverting] = useState(false);
  
  const handleItemClick = async (item: CollectionItemData) => {
    // For demo purposes, we'll create a mock Spotify URL based on the item type
    // In a real app, this would come from your backend
    let mockUrl = '';
    
    switch (item.type) {
      case 'Song':
        // Mock Spotify track URL
        mockUrl = 'https://open.spotify.com/track/1234567890';
        break;
      case 'Album':
        // Mock Spotify album URL
        mockUrl = 'https://open.spotify.com/album/0987654321';
        break;
      case 'Playlist':
        // Mock Spotify playlist URL
        mockUrl = 'https://open.spotify.com/playlist/1357924680';
        break;
    }
    
    if (mockUrl) {
      setIsConverting(true);
      
      // Convert the link and navigate to the post page
      convertLink({ url: mockUrl, description: item.description }, {
        onSuccess: (result) => {
          // Override the metadata with our collection item data for demo
          const enrichedResult = {
            ...result,
            metadata: {
              ...result.metadata,
              title: item.title,
              artist: item.artist || 'Various Artists',
              type: item.type.toLowerCase() as 'track' | 'album' | 'artist' | 'playlist',
            },
            description: item.description,
            username: item.username,
          };

          router.push(`/post?data=${encodeURIComponent(JSON.stringify(enrichedResult))}`);
        },
        onError: (error) => {
          console.error('Conversion failed:', error);
          setIsConverting(false);
          // In a real app, show an error toast
        },
      });
    }
  };
  
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground className="fixed inset-0 z-0" />
      
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8 flex items-center justify-between">
            <BackButton fallbackRoute="/explore" label="Back" />
          </div>
          
          {/* Collection Grid */}
          <CollectionGrid
            items={collectionItems}
            onItemClick={handleItemClick}
            title="My Music Collection"
          />
          
          {/* Loading Overlay */}
          {isConverting && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                <Spinner size="xl" variant="primary" className="mx-auto mb-4" />
                <p className="text-foreground font-bold">
                  Loading music details...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}