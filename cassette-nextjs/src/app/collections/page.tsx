'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { CollectionGrid, CollectionItemData } from '@/components/features/collection/collection-grid';
import { useMusicLinkConversion } from '@/hooks/use-music';

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
      convertLink(mockUrl, {
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-text-primary hover:opacity-70 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-atkinson font-bold">Back</span>
            </button>
          </div>
          
          {/* Collection Grid */}
          <CollectionGrid
            items={collectionItems}
            onItemClick={handleItemClick}
            title="My Music Collection"
          />
          
          {/* Loading Overlay */}
          {isConverting && (
            <div className="fixed inset-0 bg-cream/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
                <p className="text-text-primary font-bold">
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