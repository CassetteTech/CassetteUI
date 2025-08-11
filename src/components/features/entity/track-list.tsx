import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PlayPreview } from './play-preview';

export interface TrackListItem {
  trackNumber?: number;
  title: string;
  duration?: string;
  artists?: string[];
  previewUrl?: string;
}

interface TrackListProps {
  items: TrackListItem[];
  artwork?: string;
  albumArtist?: string;
  variant?: 'album' | 'playlist';
  className?: string;
  compact?: boolean;
  /**
   * When true, the list renders its own scroll container.
   * Set to false when the parent already provides a scrollable area
   * to avoid nested scrollbars (e.g. on the desktop Post page).
   */
  scrollable?: boolean;
}

export const TrackList: React.FC<TrackListProps> = ({
  items,
  artwork,
  albumArtist,
  variant = 'album',
  className,
  compact = false,
  scrollable = true,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        // Minimal container with subtle styling
        'rounded-xl border border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden',
        className
      )}
    >
      {/* Subtle accent bar */}
      <div
        className={cn(
          'h-0.5 bg-gradient-to-r opacity-60',
          variant === 'album' && 'from-pink-400 via-violet-400 to-sky-400',
          variant === 'playlist' && 'from-amber-400 via-rose-400 to-cyan-400'
        )}
      />

      {/* Track list container */}
      <div className={cn(scrollable ? 'max-h-[400px] overflow-y-auto' : undefined)}>
        {/* Header for desktop */}
        <div className={cn(
          'hidden sm:grid grid-cols-[auto_1fr_auto_auto] px-4 py-2 text-xs text-muted-foreground/70 border-b border-border/20 sticky top-0 bg-card/80 backdrop-blur-sm z-10',
          compact && 'hidden'
        )}
        >
          <div className="w-6 text-center">#</div>
          <div className="pl-1">Title</div>
          <div className="pr-2">Duration</div>
          <div className="justify-self-end pr-2">Play</div>
        </div>

        <ul className="divide-y divide-border/20">
          {items.map((track, index) => {
            const isActive = activeIndex === index;
            const displayArtist = track.artists?.join(', ') || albumArtist || '';

            return (
              <li
                key={`${track.title}-${index}`}
                className={cn(
                  // Base row layout
                  'group grid items-center gap-3 px-3 sm:px-4 transition-all duration-200 grid-cols-[auto_1fr_auto_auto]',
                  // Spacing density
                  compact ? 'py-2.5' : 'py-3',
                  // Clean hover effect
                  'hover:bg-muted/20',
                  // Active highlight
                  isActive ? 'bg-muted/30' : undefined
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex((cur) => (cur === index ? null : cur))}
              >
                {/* Track number - cleaner design */}
                <div className="flex items-center justify-center w-6">
                  <span className="text-xs text-muted-foreground/80 font-medium tabular-nums">
                    {track.trackNumber ?? index + 1}
                  </span>
                </div>

                {/* Title/Artist */}
                <div className="min-w-0">
                  <div className="text-foreground font-medium truncate text-sm">
                    {track.title}
                  </div>
                  {displayArtist && (
                    <div className="text-xs text-muted-foreground/80 truncate mt-0.5">
                      {displayArtist}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="hidden sm:block text-xs text-muted-foreground/70 tabular-nums text-right pr-2">
                  {track.duration || '—'}
                </div>

                {/* Preview - cleaner visibility */}
                <div className="justify-self-end">
                  <div className={cn(
                    'transition-opacity duration-200', 
                    compact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}>
                    <PlayPreview
                      previewUrl={track.previewUrl}
                      title={track.title}
                      artist={displayArtist}
                      artwork={artwork}
                      className="!p-1.5 !w-8 !h-8"
                      mobile={compact}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};


