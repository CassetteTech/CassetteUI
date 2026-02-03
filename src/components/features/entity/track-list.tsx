import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export interface TrackListItem {
  trackNumber?: number;
  title: string;
  duration?: string;
  artists?: string[];
  previewUrl?: string;
  isrc?: string;
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
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
  /**
   * The source platform of the playlist/album (e.g., 'applemusic', 'spotify').
   * Used to determine which service to use for fetching preview URLs.
   */
  sourcePlatform?: string;
}

export const TrackList: React.FC<TrackListProps> = ({
  items,
  artwork, // eslint-disable-line @typescript-eslint/no-unused-vars
  albumArtist,
  variant = 'album', // eslint-disable-line @typescript-eslint/no-unused-vars
  className,
  compact = false,
  scrollable = true,
  sourcePlatform,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<number | null>(null);
  // Cache fetched preview URLs so we don't refetch
  const [fetchedPreviewUrls, setFetchedPreviewUrls] = useState<Record<number, string | null>>({});
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});

  // Fetch preview URL from the appropriate music service based on source platform
  const fetchPreviewUrl = useCallback(async (track: TrackListItem): Promise<string | null> => {
    try {
      const params = new URLSearchParams();
      // Include source platform to route to correct service
      if (sourcePlatform) {
        params.set('sourcePlatform', sourcePlatform);
      }
      // Include platform-specific track IDs
      if (track.appleMusicTrackId) {
        params.set('appleMusicTrackId', track.appleMusicTrackId);
      }
      if (track.spotifyTrackId) {
        params.set('spotifyTrackId', track.spotifyTrackId);
      }
      if (track.isrc) {
        params.set('isrc', track.isrc);
      }
      params.set('title', track.title);
      if (track.artists?.[0]) {
        params.set('artist', track.artists[0]);
      }

      const response = await fetch(`/api/music/preview?${params.toString()}`);
      if (!response.ok) {
        console.error('Failed to fetch preview URL:', response.status);
        return null;
      }

      const data = await response.json();
      return data.previewUrl || null;
    } catch (error) {
      console.error('Error fetching preview URL:', error);
      return null;
    }
  }, [sourcePlatform]);

  const handleTogglePlay = async (index: number, track: TrackListItem) => {
    try {
      // Stop any currently playing track
      if (playingIndex !== null && playingIndex !== index) {
        const currentAudio = audioRefs.current[playingIndex];
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // If already playing this track, pause it
      if (playingIndex === index) {
        const audio = audioRefs.current[index];
        if (audio) {
          audio.pause();
        }
        setPlayingIndex(null);
        return;
      }

      setIsLoading(index);

      // Get preview URL - check cache first, then existing prop, then fetch
      let previewUrl = fetchedPreviewUrls[index];
      if (previewUrl === undefined) {
        // Not in cache - check if track has it
        previewUrl = track.previewUrl || null;

        // If no preview URL, try to fetch one
        if (!previewUrl) {
          console.log('🎵 Fetching preview URL for:', track.title);
          previewUrl = await fetchPreviewUrl(track);

          // Cache the result (even if null, to avoid refetching)
          setFetchedPreviewUrls(prev => ({ ...prev, [index]: previewUrl }));
        }
      }

      if (!previewUrl) {
        console.log('❌ No preview available for:', track.title);
        setIsLoading(null);
        return;
      }

      // Create audio element if needed
      if (!audioRefs.current[index]) {
        const newAudio = new Audio();
        audioRefs.current[index] = newAudio;
        newAudio.addEventListener('ended', () => {
          setPlayingIndex(null);
        });
      }

      const targetAudio = audioRefs.current[index];
      targetAudio.src = previewUrl;
      await targetAudio.play();
      setPlayingIndex(index);
      setIsLoading(null);
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
                {/* Track number - with play functionality for platforms that support previews */}
                <div className="relative flex items-center justify-center w-6">
                  {sourcePlatform?.toLowerCase() === 'spotify' ? (
                    // Spotify doesn't support preview URLs anymore - just show track number
                    <span className="text-xs text-muted-foreground/70 font-medium tabular-nums">
                      {track.trackNumber ?? index + 1}
                    </span>
                  ) : (
                    // Other platforms - show play button on hover
                    <button
                      onClick={() => handleTogglePlay(index, track)}
                      className="group/play flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 hover:bg-muted/40 hover:scale-105"
                      aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                      {/* Track number - shown by default, hidden on hover */}
                      <span className={cn(
                        "text-xs text-muted-foreground/70 font-medium tabular-nums transition-opacity duration-200",
                        (isActive || isPlaying || isLoadingTrack) ? "opacity-0 group-hover/play:opacity-0" : "group-hover/play:opacity-0"
                      )}>
                        {track.trackNumber ?? index + 1}
                      </span>

                      {/* Play/pause icon - shown on hover or when playing/loading */}
                      <div className={cn(
                        "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                        (isActive || isPlaying || isLoadingTrack) ? "opacity-100" : "opacity-0 group-hover/play:opacity-100"
                      )}>
                        {isLoadingTrack ? (
                          <Spinner size="xs" variant="muted" />
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


