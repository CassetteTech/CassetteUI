import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { appLogger } from '@/lib/observability/logger';

const ROW_HEIGHT_PX = 52;
export const COLLAPSED_MAX_HEIGHT_PX = ROW_HEIGHT_PX * 6.5;
export const EXPANDABLE_MIN_TRACKS = 9;

const parseDurationSeconds = (duration?: string): number | null => {
  if (!duration) return null;
  const parts = duration.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some(Number.isNaN)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

export const formatTrackListDuration = (items: TrackListItem[]): string | null => {
  if (items.length === 0) return null;
  const seconds = items.map((item) => parseDurationSeconds(item.duration));
  if (seconds.some((value) => value === null)) return null;
  const totalMinutes = Math.round((seconds as number[]).reduce((a, b) => a + b, 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

export const formatTrackListStats = (items: TrackListItem[]): string => {
  const label = `${items.length} ${items.length === 1 ? 'track' : 'tracks'}`;
  const duration = formatTrackListDuration(items);
  return duration ? `${label}, ${duration}` : label;
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
  albumArtist?: string;
  className?: string;
  compact?: boolean;
  sourcePlatform?: string;
}

export const TrackList: React.FC<TrackListProps> = ({
  items,
  albumArtist,
  className,
  compact = false,
  sourcePlatform,
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fetchedPreviewUrls, setFetchedPreviewUrls] = useState<Record<number, string | null>>({});
  const [unavailablePreviews, setUnavailablePreviews] = useState<Record<number, true>>({});
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isCollapsible = items.length >= EXPANDABLE_MIN_TRACKS;
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

  const fetchPreviewUrl = useCallback(async (track: TrackListItem): Promise<string | null> => {
    try {
      const params = new URLSearchParams();
      if (sourcePlatform) {
        params.set('sourcePlatform', sourcePlatform);
      }
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
      if (playingIndex !== null && playingIndex !== index) {
        const currentAudio = audioRefs.current[playingIndex];
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      if (playingIndex === index) {
        const audio = audioRefs.current[index];
        if (audio) {
          audio.pause();
        }
        setPlayingIndex(null);
        return;
      }

      setIsLoading(index);

      let previewUrl = fetchedPreviewUrls[index];
      if (previewUrl === undefined) {
        previewUrl = track.previewUrl || null;

        if (!previewUrl) {
          appLogger.debug('track_preview_url_fetch_started', { source_platform: sourcePlatform });
          previewUrl = await fetchPreviewUrl(track);

          setFetchedPreviewUrls(prev => ({ ...prev, [index]: previewUrl }));
        }
      }

      if (!previewUrl) {
        appLogger.debug('track_preview_unavailable', { source_platform: sourcePlatform });
        setUnavailablePreviews((current) => ({ ...current, [index]: true }));
        setIsLoading(null);
        return;
      }

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
          'card-quiet overflow-hidden relative',
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
            const canPreview = Boolean(
              track.previewUrl || track.isrc || track.spotifyTrackId || track.appleMusicTrackId
            );
            const trackNumberLabel = String(track.trackNumber ?? index + 1).padStart(trackNumberPad, '0');

            return (
              <li
                key={`${track.title}-${index}`}
                data-track-row
                style={{ minHeight: ROW_HEIGHT_PX }}
                className={cn(
                  'group grid items-center gap-3 px-3 sm:px-4 transition-colors duration-200 grid-cols-[auto_1fr_auto] border-b border-border/40 last:border-b-0',
                  compact ? 'py-2' : 'py-2.5',
                  'hover:bg-muted/40',
                  isPlaying && 'bg-primary/10 shadow-[inset_2px_0_0_hsl(var(--primary))]'
                )}
              >
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
        'card-quiet overflow-hidden',
        'relative',
        className
      )}
    >
      {isCollapsible ? (
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
