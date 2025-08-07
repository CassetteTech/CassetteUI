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
        // Card container
        'rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
        className
      )}
    >
      {/* Accent bar (variant-aware) */}
      <div
        className={cn(
          'h-1.5 bg-gradient-to-r',
          variant === 'album' && 'from-pink-400 via-violet-400 to-sky-400',
          variant === 'playlist' && 'from-amber-400 via-rose-400 to-cyan-400'
        )}
      />

      {/* Optional sticky header for large screens */}
      <div className={cn(scrollable ? 'max-h-[360px] overflow-y-auto' : undefined)}>
        <div className={cn(
          'hidden sm:grid grid-cols-[auto_1fr_auto_auto] px-4 py-2 text-xs text-muted-foreground/80 border-b border-border/40 sticky top-0 bg-card/70 backdrop-blur-md z-10',
          compact && 'hidden'
        )}
        >
          <div className="w-6 text-center">#</div>
          <div className="pl-1">Title</div>
          <div className="pr-2">Time</div>
          <div className="justify-self-end pr-2">Preview</div>
        </div>

        <ul className="divide-y divide-border/40">
          {items.map((track, index) => {
            const isActive = activeIndex === index;
            const displayArtist = track.artists?.join(', ') || albumArtist || '';

            return (
              <li
                key={`${track.title}-${index}`}
                className={cn(
                  // Base row layout
                  'group grid items-center gap-3 px-3 sm:px-4 transition-colors grid-cols-[auto_1fr_auto_auto]',
                  // Spacing density
                  compact ? 'py-2' : 'py-3',
                  // Subtle zebra striping and hover effect
                  'odd:bg-transparent even:bg-muted/20 hover:bg-muted/30',
                  // Active highlight
                  isActive ? 'bg-muted/40' : undefined
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex((cur) => (cur === index ? null : cur))}
              >
                {/* Number chip */}
                <div className="flex items-center justify-center w-6">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] sm:text-xs text-muted-foreground/90 ring-1 ring-border/60 bg-background/60 tabular-nums">
                    {track.trackNumber ?? index + 1}
                  </span>
                </div>

                {/* Title/Artist */}
                <div className="min-w-0">
                  <div className="text-foreground font-medium truncate">
                    {track.title}
                  </div>
                  {displayArtist && (
                    <div className="text-xs text-muted-foreground truncate">
                      {displayArtist}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="hidden sm:block text-xs text-muted-foreground tabular-nums text-right pr-2">
                  {track.duration || ''}
                </div>

                {/* Preview - hidden until hover on desktop to reduce noise */}
                <div className="justify-self-end">
                  <div className={cn('transition-opacity duration-150', compact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                    <PlayPreview
                      previewUrl={track.previewUrl}
                      title={track.title}
                      artist={displayArtist}
                      artwork={artwork}
                      className="!p-1 !w-10 !h-10"
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


