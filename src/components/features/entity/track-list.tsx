import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollFade } from '@/components/ui/scroll-fade';
import { Spinner } from '@/components/ui/spinner';
import { appLogger } from '@/lib/observability/logger';

// Keep in sync with the row's min-h-[52px].
const ROW_HEIGHT_PX = 52;
// Collapsed preview ends on a half-visible row so the cutoff reads as
// "there's more" instead of accidental clipping.
const COLLAPSED_MAX_HEIGHT_PX = ROW_HEIGHT_PX * 6.5;
// Below this the collapsed preview would hide less than two rows — not worth a toggle.
const EXPANDABLE_MIN_TRACKS = 9;

const parseDurationSeconds = (duration?: string): number | null => {
  if (!duration) return null;
  const parts = duration.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some(Number.isNaN)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

/** Header stat line for a track list, e.g. "117 tracks · 6 hr 24 min". */
export const formatTrackListStats = (items: TrackListItem[]): string => {
  const label = `${items.length} ${items.length === 1 ? 'track' : 'tracks'}`;
  if (items.length === 0) return label;
  const seconds = items.map((item) => parseDurationSeconds(item.duration));
  // Only claim a total runtime when every track reports a duration.
  if (seconds.some((value) => value === null)) return label;
  const totalMinutes = Math.round((seconds as number[]).reduce((a, b) => a + b, 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${label} · ${hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`}`;
};

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
   * When true, the list renders its own scroll container with edge fades.
   * Set to false when the parent already provides a scrollable area
   * to avoid nested scrollbars.
   */
  scrollable?: boolean;
  /**
   * With `scrollable`, stretches the scroll area to fill the parent's
   * (flex-constrained) height instead of capping at a fixed max height.
   */
  scrollFill?: boolean;
  /**
   * Collapsed-preview mode for page-flow layouts: shows the first rows with a
   * fade into a "Show all" toggle instead of a nested scroll region.
   * Takes precedence over `scrollable`.
   */
  expandable?: boolean;
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
  scrollFill = false,
  expandable = false,
  sourcePlatform,
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Cache fetched preview URLs so we don't refetch
  const [fetchedPreviewUrls, setFetchedPreviewUrls] = useState<Record<number, string | null>>({});
  const [unavailablePreviews, setUnavailablePreviews] = useState<Record<number, true>>({});
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isScrollMode = scrollable && !expandable;
  const isCollapsible = expandable && items.length >= EXPANDABLE_MIN_TRACKS;
  const trackNumberPad = Math.max(2, String(items.length).length);

  useEffect(() => () => {
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.src = '';
    });
    audioRefs.current = {};
  }, []);

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
        appLogger.warn('track_preview_url_fetch_failed', {
          http_status: response.status,
          source_platform: sourcePlatform,
        });
        return null;
      }

      const data = await response.json();
      return data.previewUrl || null;
    } catch (error) {
      appLogger.warn('track_preview_url_fetch_failed', { error, source_platform: sourcePlatform });
      return null;
    }
  }, [sourcePlatform]);

  const handleTogglePlay = async (index: number, track: TrackListItem) => {
    if (unavailablePreviews[index]) return;

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
          appLogger.debug('track_preview_url_fetch_started', { source_platform: sourcePlatform });
          previewUrl = await fetchPreviewUrl(track);

          // Cache the result (even if null, to avoid refetching)
          setFetchedPreviewUrls(prev => ({ ...prev, [index]: previewUrl }));
        }
      }

      if (!previewUrl) {
        appLogger.debug('track_preview_unavailable', { source_platform: sourcePlatform });
        setUnavailablePreviews((current) => ({ ...current, [index]: true }));
        setIsLoading(null);
        return;
      }

      // Create audio element if needed
      if (!audioRefs.current[index]) {
        const newAudio = new Audio();
        audioRefs.current[index] = newAudio;
        newAudio.onended = () => {
          setPlayingIndex(null);
        };
        newAudio.onerror = () => {
          setUnavailablePreviews((current) => ({ ...current, [index]: true }));
          setPlayingIndex(null);
          setIsLoading(null);
        };
      }

      const targetAudio = audioRefs.current[index];
      targetAudio.src = previewUrl;
      await targetAudio.play();
      setPlayingIndex(index);
      setIsLoading(null);
    } catch (error) {
      appLogger.warn('track_preview_playback_failed', { error, source_platform: sourcePlatform });
      setUnavailablePreviews((current) => ({ ...current, [index]: true }));
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

  const trackRows = (
    <ul>
      {items.map((track, index) => {
            const isPlaying = playingIndex === index;
            const isLoadingTrack = isLoading === index;
            const isPreviewUnavailable = Boolean(unavailablePreviews[index]);
            const displayArtist = track.artists?.join(', ') || albumArtist || '';
            const showIcon = isPlaying || isLoadingTrack;
            // Only offer a play affordance when the track carries something a
            // preview can be resolved from; some source platforms provide
            // bare titles only, and a button that can never work reads as broken.
            const canPreview = Boolean(
              track.previewUrl || track.isrc || track.spotifyTrackId || track.appleMusicTrackId
            );
            const trackNumberLabel = String(track.trackNumber ?? index + 1).padStart(trackNumberPad, '0');

            return (
              <li
                key={`${track.title}-${index}`}
                className={cn(
                  'group grid items-center gap-3 px-3 sm:px-4 transition-colors duration-200 grid-cols-[auto_1fr_auto] border-b border-border/40 last:border-b-0 min-h-[52px]',
                  compact ? 'py-2' : 'py-2.5',
                  'hover:bg-muted/40',
                  isScrollMode && 'snap-start',
                  isPlaying && 'bg-primary/10 shadow-[inset_2px_0_0_hsl(var(--primary))]'
                )}
              >
                {/* Track number / play button */}
                <div className="relative flex items-center justify-end w-7 pr-1">
                  {canPreview ? (
                    <button
                      onClick={() => handleTogglePlay(index, track)}
                      disabled={isPreviewUnavailable}
                      title={isPreviewUnavailable ? 'Preview unavailable' : undefined}
                      className="relative flex size-6 items-center justify-center rounded-full transition-all duration-200 hover:bg-primary/15 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus:outline-none disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label={isPreviewUnavailable ? `Preview unavailable for ${track.title}` : isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                      {isPreviewUnavailable ? (
                        <span className="text-sm font-medium text-muted-foreground/60" aria-hidden="true">×</span>
                      ) : showIcon ? (
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
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums transition-opacity duration-200 group-hover:opacity-0">
                            {trackNumberLabel}
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
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {trackNumberLabel}
                    </span>
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
                <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums text-right">
                  {track.duration || ''}
                </div>
              </li>
            );
          })}
    </ul>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        'rounded-xl border border-border/60 bg-card overflow-hidden elev-1',
        'relative',
        isScrollMode && scrollFill && 'flex flex-col',
        className
      )}
    >
      {isScrollMode ? (
        <ScrollFade
          className={cn('z-10', scrollFill && 'flex-1')}
          scrollClassName={cn(
            'snap-y snap-proximity [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full',
            scrollFill ? 'h-full' : 'max-h-[400px]'
          )}
          scrollRef={scrollContainerRef}
        >
          {trackRows}
        </ScrollFade>
      ) : isCollapsible ? (
        <>
          <motion.div
            initial={false}
            animate={{ height: expanded ? 'auto' : COLLAPSED_MAX_HEIGHT_PX }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            onAnimationComplete={() => {
              if (!expanded) {
                rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }}
            className="relative overflow-hidden"
          >
            {trackRows}
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent transition-opacity duration-300',
                expanded ? 'opacity-0' : 'opacity-100'
              )}
            />
          </motion.div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="size-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                Show all {items.length} tracks
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </>
      ) : (
        <div className="relative z-10">
          {trackRows}
        </div>
      )}
    </div>
  );
};
