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

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border/60 bg-card overflow-hidden elev-1 relative',
          className
        )}
      >
        <div className="py-8 text-center text-sm text-muted-foreground">
          No tracks available.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card overflow-hidden elev-1',
        'relative',
        className
      )}
    >
      {/* Track list container */}
      <div className={cn(
        'relative z-10',
        scrollable && 'max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full'
      )}>
        {/* Header for desktop */}
        <div className={cn(
          'hidden sm:grid grid-cols-[auto_1fr_auto] px-4 py-2.5 text-[11px] text-muted-foreground border-b border-border/60 sticky top-0 bg-card/80 backdrop-blur-sm z-10 font-medium uppercase tracking-wider',
          compact && 'hidden'
        )}
        >
          <div className="w-7 text-right pr-1">#</div>
          <div className="pl-2">Title</div>
          <div className="pr-2 text-right">Duration</div>
        </div>

        <ul>
          {items.map((track, index) => {
            const isPlaying = playingIndex === index;
            const isLoadingTrack = isLoading === index;
            const displayArtist = track.artists?.join(', ') || albumArtist || '';
            const showIcon = isPlaying || isLoadingTrack;

            return (
              <li
                key={`${track.title}-${index}`}
                className={cn(
                  'group grid items-center gap-3 px-3 sm:px-4 transition-colors duration-200 grid-cols-[auto_1fr_auto] border-b border-border/40 last:border-b-0 min-h-[52px]',
                  compact ? 'py-2' : 'py-2.5',
                  'hover:bg-muted/40',
                  isPlaying && 'bg-primary/10 shadow-[inset_2px_0_0_theme(colors.primary)]'
                )}
              >
                {/* Track number / play button */}
                <div className="relative flex items-center justify-end w-7 pr-1">
                  {sourcePlatform?.toLowerCase() === 'spotify' ? (
                    <span className={cn(
                      'text-xs font-medium tabular-nums',
                      isPlaying ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {track.trackNumber ?? index + 1}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTogglePlay(index, track)}
                      className="relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 hover:bg-primary/15 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus:outline-none"
                      aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                      {showIcon ? (
                        isLoadingTrack ? (
                          <Spinner size="xs" variant="muted" />
                        ) : (
                          <svg
                            className="w-3.5 h-3.5 text-primary"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        )
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground font-medium tabular-nums transition-opacity duration-200 group-hover:opacity-0">
                            {track.trackNumber ?? index + 1}
                          </span>
                          <svg
                            className="absolute w-3.5 h-3.5 text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Title/Artist */}
                <div className="min-w-0 pl-1">
                  <div className={cn(
                    'font-medium truncate text-sm',
                    isPlaying ? 'text-primary' : 'text-foreground'
                  )}>
                    {track.title}
                  </div>
                  {displayArtist && (
                    <div className="text-[13px] text-muted-foreground/80 truncate mt-0.5">
                      {displayArtist}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="hidden sm:block text-xs text-muted-foreground tabular-nums text-right">
                  {track.duration || ''}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};


