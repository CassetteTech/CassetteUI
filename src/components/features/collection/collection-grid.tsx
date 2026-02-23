import React from 'react';
import { CollectionItem } from './collection-item';
import { HeadlineText } from '@/components/ui/typography';

export interface CollectionItemData {
  type: 'Song' | 'Album' | 'Playlist';
  title: string;
  artist?: string;
  album?: string;
  songCount?: number;
  duration: string;
  description: string;
  username: string;
  artwork?: string;
}

interface CollectionGridProps {
  items: CollectionItemData[];
  onItemClick?: (item: CollectionItemData) => void;
  title?: string;
}

export const CollectionGrid: React.FC<CollectionGridProps> = ({ 
  items, 
  onItemClick,
  title = "My Collection"
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <HeadlineText className="text-muted-foreground mb-2">No items in your collection</HeadlineText>
        <p className="text-muted-foreground">Start adding music to see it here!</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {title && (
        <HeadlineText className="mb-6 text-2xl font-bold">{title}</HeadlineText>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <CollectionItem
            key={`${item.type}-${item.title}-${index}`}
            item={item}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>
    </div>
  );
};