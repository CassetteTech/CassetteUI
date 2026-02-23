import React from 'react';
import Image from 'next/image';
import { MainContainer } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { HeadlineText, BodyText, UIText } from '@/components/ui/typography';
import { CollectionItemData } from './collection-grid';
import { cn } from '@/lib/utils';

interface CollectionItemProps {
  item: CollectionItemData;
  onClick?: () => void;
}

export const CollectionItem: React.FC<CollectionItemProps> = ({ item, onClick }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Song':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Album':
        return 'bg-warning/10 text-warning-text border-warning/30';
      case 'Playlist':
        return 'bg-info/10 text-info-text border-info/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-border/30';
    }
  };
  
  const getDefaultArtwork = () => {
    // Return a placeholder image based on type
    return '/images/ic_music.png';
  };
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer transition-all duration-200",
        "hover:transform hover:scale-[1.02]"
      )}
    >
      {/* Shadow layer */}
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-muted-foreground rounded-lg opacity-50 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform" />
      
      {/* Main container */}
      <MainContainer className="relative bg-card p-4 border-2 border-foreground hover:border-primary transition-colors">
        <div className="flex gap-4">
          {/* Artwork */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
              <Image
                src={item.artwork || getDefaultArtwork()}
                alt={item.title}
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Type Badge */}
            <Badge 
              className={cn(
                "mb-2 text-xs font-bold uppercase",
                getTypeColor(item.type)
              )}
            >
              {item.type}
            </Badge>
            
            {/* Title */}
            <HeadlineText className="text-base font-bold truncate mb-1">
              {item.title}
            </HeadlineText>
            
            {/* Artist/Album info */}
            {item.artist && (
              <BodyText className="text-sm text-muted-foreground truncate">
                {item.artist}
                {item.album && ` • ${item.album}`}
              </BodyText>
            )}
            
            {/* Metadata */}
            <div className="flex items-center gap-3 mt-2">
              {item.songCount && (
                <UIText className="text-xs text-muted-foreground">
                  {item.songCount} songs
                </UIText>
              )}
              <UIText className="text-xs text-muted-foreground">
                {item.duration}
              </UIText>
            </div>
            
            {/* Description */}
            {item.description && (
              <BodyText className="text-xs text-muted-foreground mt-2 line-clamp-2">
                &ldquo;{item.description}&rdquo;
              </BodyText>
            )}
            
            {/* Username */}
            <UIText className="text-xs text-muted-foreground/70 mt-2">
              @{item.username}
            </UIText>
          </div>
        </div>
        
        {/* Hover indicator */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg 
            className="w-5 h-5 text-primary" 
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
      </MainContainer>
    </div>
  );
};