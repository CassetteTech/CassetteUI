import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { streamingServices } from './streaming-links';
import { apiService } from '@/services/api';
import { detectContentType } from '@/utils/content-type-detection';

type PlatformKey = 'spotify' | 'appleMusic' | 'deezer';

interface PlaylistStreamingLinksProps {
  links: {
    spotify?: string; // existing base playlist URL when available
    appleMusic?: string;
    deezer?: string;
  };
  className?: string;
  playlistId: string;
  sourceUrl?: string;
  sourcePlatform?: string;
}

const PLATFORMS: Array<PlatformKey> = ['spotify', 'appleMusic', 'deezer'];

const normalizePlatformKey = (platform?: string | null): PlatformKey | null => {
  if (!platform) return null;
  const lowered = platform.toLowerCase();
  if (lowered === 'spotify') return 'spotify';
  if (lowered === 'deezer') return 'deezer';
  if (lowered === 'applemusic' || lowered === 'apple') return 'appleMusic';
  return null;
};

export const PlaylistStreamingLinks: React.FC<PlaylistStreamingLinksProps> = ({
  links,
  className,
  playlistId,
  sourceUrl,
  sourcePlatform,
}) => {
  const providedSourceUrl = sourceUrl?.trim();
  const detectedFromProvided = providedSourceUrl ? detectContentType(providedSourceUrl).platform : null;
  const normalizedFromProp = normalizePlatformKey(sourcePlatform);
  const fallbackSourceUrl =
    (normalizedFromProp ? links[normalizedFromProp] : undefined) ||
    links.spotify ||
    links.appleMusic ||
    links.deezer;
  const resolvedSourceUrl = providedSourceUrl || fallbackSourceUrl || null;
  const detectedFromResolved = resolvedSourceUrl ? detectContentType(resolvedSourceUrl).platform : null;
  const sourcePlatformKey =
    normalizedFromProp ||
    normalizePlatformKey(detectedFromProvided) ||
    normalizePlatformKey(detectedFromResolved) ||
    (resolvedSourceUrl
      ? (PLATFORMS.find((platform) => links[platform] === resolvedSourceUrl || links[platform]) as PlatformKey | undefined) || null
      : null);
  const sourceService = sourcePlatformKey ? streamingServices[sourcePlatformKey] : null;

  return (
    <div
      className={cn(
        'p-6 rounded-2xl bg-text-primary/5 border border-text-primary/10',
        'shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap gap-2 justify-center">
        {PLATFORMS.map((platform) => {
          const isSourcePlatform = sourcePlatformKey === platform;
          const url = isSourcePlatform && resolvedSourceUrl ? resolvedSourceUrl : links[platform];
          const service = streamingServices[platform];
          if (!service) return null;

          const commonClasses = cn(
            'group relative flex items-center justify-center',
            'px-4 py-2.5 rounded-full transition-all duration-200',
            'border-2 border-foreground/60 text-foreground',
            'bg-card/80 hover:bg-card text-sm font-medium backdrop-blur-sm',
          );

          return url ? (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={commonClasses}
            >
              <div className="relative w-4 h-4 mr-2">
                <Image src={service.icon} alt={service.name} width={16} height={16} className="object-contain" />
              </div>
              <span className="whitespace-nowrap">Convert to {service.name}</span>
            </a>
          ) : isSourcePlatform && resolvedSourceUrl ? null : (
            <button
              key={platform}
              type="button"
              className={commonClasses}
              onClick={() => {
                apiService.createPlaylist(playlistId, platform.toLowerCase());
              }}
            >
              <div className="relative w-4 h-4 mr-2">
                <Image src={service.icon} alt={service.name} width={16} height={16} className="object-contain" />
              </div>
              <span className="whitespace-nowrap">Convert to {service.name}</span>
            </button>
          );
        })}

        {resolvedSourceUrl && (
          <a
            key="source-link"
            href={resolvedSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'group relative flex items-center justify-center',
              'px-4 py-2.5 rounded-full transition-all duration-200',
              'border-2 border-foreground/60 text-foreground',
              'bg-card/80 hover:bg-card text-sm font-medium backdrop-blur-sm',
            )}
          >
            {sourceService && (
              <div className="relative w-4 h-4 mr-2">
                <Image src={sourceService.icon} alt={sourceService.name} width={16} height={16} className="object-contain" />
              </div>
            )}
            <span className="whitespace-nowrap">Open Source Link</span>
          </a>
        )}
      </div>
    </div>
  );
};

