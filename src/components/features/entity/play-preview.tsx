import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { captureClientEvent } from '@/lib/analytics/client';

interface PlayPreviewProps {
  previewUrl?: string;
  title: string;
  artist: string;
  artwork?: string;
  className?: string;
  mobile?: boolean;
}

export const PlayPreview: React.FC<PlayPreviewProps> = ({
  previewUrl,
  title,
  artist,
  artwork,
  className,
  mobile = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  const handleTogglePlay = async () => {
    if (!previewUrl || !audioRef.current) return;

    if (!isExpanded) {
      setIsExpanded(true);
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        audioRef.current.src = previewUrl;
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        void captureClientEvent('preview_playback_started', {
          route: typeof window !== 'undefined' ? window.location.pathname : '/post',
          source_surface: 'post',
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
      void captureClientEvent('preview_playback_failed', {
        route: typeof window !== 'undefined' ? window.location.pathname : '/post',
        source_surface: 'post',
      });
    }
  };

  const handleExpandClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioError = (error: unknown) => {
    console.error('Audio error:', error);
    setIsPlaying(false);
    setIsLoading(false);
    void captureClientEvent('preview_playback_failed', {
      route: typeof window !== 'undefined' ? window.location.pathname : '/post',
      source_surface: 'post',
    });
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!previewUrl) return null;

  if (mobile) {
    return (
      <div
        className={cn(
          'bg-background/60 backdrop-blur-sm border border-border/40 rounded-lg shadow-lg transition-all duration-300 ease-in-out cursor-pointer',
          isExpanded
            ? 'p-2 flex items-center gap-2 w-full max-w-xs'
            : 'p-0.5 w-12 h-12 flex items-center justify-center',
          className
        )}
        onClick={!isExpanded ? handleExpandClick : undefined}
      >
        <div className="relative flex-shrink-0">
          <Image
            src={artwork || '/images/cassette_logo.png'}
            alt={title}
            width={isExpanded ? 32 : 36}
            height={isExpanded ? 32 : 36}
            className="rounded-md object-cover opacity-90"
          />
          <button
            onClick={handleTogglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md transition-opacity hover:bg-black/40"
            aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
          >
            {isLoading ? (
              <Spinner size={isExpanded ? 'xs' : 'sm'} variant="white" />
            ) : (
              <svg
                className={cn(
                  'text-white',
                  isExpanded ? 'w-3 h-3' : 'w-4 h-4'
                )}
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
          </button>
        </div>

        {isExpanded && (
          <div className="flex-1 min-w-0">
            <div className="relative w-full h-1 bg-border/50 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-primary/70 transition-all duration-100 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {duration > 0 && (
              <div className="text-center text-xs text-muted-foreground/70 mt-1">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            )}
          </div>
        )}

        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
          preload="none"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-background/70 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg transition-all duration-300 ease-in-out cursor-pointer',
        isExpanded
          ? 'p-3 flex items-center gap-3 w-full max-w-sm'
          : 'p-1 w-16 h-16 flex items-center justify-center',
        className
      )}
      onClick={!isExpanded ? handleExpandClick : undefined}
    >
      <div className="relative flex-shrink-0">
        <Image
          src={artwork || '/images/cassette_logo.png'}
          alt={title}
          width={isExpanded ? 48 : 48}
          height={isExpanded ? 48 : 48}
          className="rounded-md object-cover opacity-90"
        />
        <button
          onClick={handleTogglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md transition-opacity hover:bg-black/50"
          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        >
          {isLoading ? (
            <Spinner size={isExpanded ? 'sm' : 'md'} variant="white" />
          ) : (
            <svg
              className={cn(
                'text-white',
                isExpanded ? 'w-5 h-5' : 'w-6 h-6'
              )}
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
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <div className="font-medium text-sm text-foreground/90 truncate">{title}</div>
            <div className="text-xs text-muted-foreground/80 truncate">{artist}</div>
          </div>

          <div className="relative w-full h-1 bg-border/60 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-primary/80 transition-all duration-100 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {duration > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground/80 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          )}
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        preload="none"
      />
    </div>
  );
};

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
