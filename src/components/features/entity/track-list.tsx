import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  artwork, // eslint-disable-line @typescript-eslint/no-unused-vars
  albumArtist,
  variant = 'album', // eslint-disable-line @typescript-eslint/no-unused-vars
  className,
  compact = false,
  scrollable = true,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});

  const handleTogglePlay = async (index: number, previewUrl?: string) => {
    if (!previewUrl) return;

    try {
      // Stop any currently playing track
      if (playingIndex !== null && playingIndex !== index) {
        const currentAudio = audioRefs.current[playingIndex];
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      const audio = audioRefs.current[index];
      if (!audio) {
        // Create new audio element if it doesn't exist
        const newAudio = new Audio();
        audioRefs.current[index] = newAudio;
        newAudio.addEventListener('ended', () => {
          setPlayingIndex(null);
        });
      }

      const targetAudio = audioRefs.current[index];
      
      if (playingIndex === index) {
        // Pause current track
        targetAudio.pause();
        setPlayingIndex(null);
      } else {
        // Play new track
        setIsLoading(index);
        targetAudio.src = previewUrl;
        await targetAudio.play();
        setPlayingIndex(index);
        setIsLoading(null);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(null);
      setPlayingIndex(null);
    }
  };

  return (
    <div
      className={cn(
        // Enhanced glass morphism container
        'rounded-xl border border-border/30 bg-card/20 backdrop-blur-md overflow-hidden shadow-lg',
        // Subtle inner glow effect
        'before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none before:z-0',
        'relative',
        className
      )}
    >

      {/* Track list container */}
      <div className={cn(
        'relative z-10',
        scrollable ? 'max-h-[400px] overflow-y-auto' : undefined
      )}>
        {/* Header for desktop */}
        <div className={cn(
          'hidden sm:grid grid-cols-[auto_1fr_auto] px-4 py-3 text-xs text-muted-foreground/70 border-b border-border/20 sticky top-0 bg-card/80 backdrop-blur-md z-10 font-semibold',
          compact && 'hidden'
        )}
        >
          <div className="w-6 text-center">#</div>
          <div className="pl-1">Title</div>
          <div className="pr-2 text-right">Duration</div>
        </div>

        <ul className="divide-y divide-border/10">
          {items.map((track, index) => {
            const isActive = activeIndex === index;
            const isPlaying = playingIndex === index;
            const isLoadingTrack = isLoading === index;
            const displayArtist = track.artists?.join(', ') || albumArtist || '';

            return (
              <li
                key={`${track.title}-${index}`}
                className={cn(
                  // Base row layout with enhanced transitions
                  'group grid items-center gap-3 px-3 sm:px-4 transition-all duration-300 grid-cols-[auto_1fr_auto]',
                  // Spacing density
                  compact ? 'py-3' : 'py-3.5',
                  // Enhanced hover effect with subtle glow
                  'hover:bg-muted/20 hover:shadow-sm',
                  // Active highlight with stronger presence
                  isActive ? 'bg-muted/30 shadow-sm' : undefined,
                  // Playing state with accent
                  isPlaying ? 'bg-primary/10' : undefined
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex((cur) => (cur === index ? null : cur))}
              >
                {/* Track number with play functionality */}
                <div className="relative flex items-center justify-center w-6">
                  {track.previewUrl ? (
                    <button
                      onClick={() => handleTogglePlay(index, track.previewUrl)}
                      className="group/play flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 hover:bg-muted/40 hover:scale-105"
                      aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                      {/* Track number - shown by default, hidden on hover if preview available */}
                      <span className={cn(
                        "text-xs text-muted-foreground/70 font-medium tabular-nums transition-opacity duration-200",
                        (isActive || isPlaying) ? "opacity-0 group-hover/play:opacity-0" : "group-hover/play:opacity-0"
                      )}>
                        {track.trackNumber ?? index + 1}
                      </span>
                      
                      {/* Play/pause icon - shown on hover or when playing */}
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                        (isActive || isPlaying) ? "opacity-100" : "opacity-0 group-hover/play:opacity-100"
                      )}>
                        {isLoadingTrack ? (
                          <div className="animate-spin rounded-full border border-transparent border-t-muted-foreground/70 w-3 h-3" />
                        ) : (
                          <svg 
                            className="w-3 h-3 text-muted-foreground/80"
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            {isPlaying ? (
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            ) : (
                              <path d="M8 5v14l11-7z" />
                            )}
                          </svg>
                        )}
                      </div>
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground/70 font-medium tabular-nums">
                      {track.trackNumber ?? index + 1}
                    </span>
                  )}
                </div>

                {/* Title/Artist */}
                <div className="min-w-0">
                  <div className="text-foreground font-medium truncate text-sm leading-snug">
                    {track.title}
                  </div>
                  {displayArtist && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {displayArtist}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="hidden sm:block text-xs text-muted-foreground/60 tabular-nums text-right">
                  {track.duration || '—'}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};


