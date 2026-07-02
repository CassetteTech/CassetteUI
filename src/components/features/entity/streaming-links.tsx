import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { captureClientEvent } from '@/lib/analytics/client';
import { normalizePlatform, sanitizeDomain } from '@/lib/analytics/sanitize';
import type { ElementTypeDimension } from '@/lib/analytics/events';
import { buildPostPlatformConversionClickedProps } from '@/lib/analytics/post-platform-conversion';

interface StreamingLinksProps {
  links: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
    tidal?: string;
    youtubeMusic?: string;
  };
  className?: string;
  postId?: string;
  elementType?: ElementTypeDimension;
  sourcePlatform?: string;
  isAuthenticated?: boolean;
}

export interface StreamingService {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const streamingServices: Record<string, StreamingService> = {
  spotify: {
    name: 'Spotify',
    icon: '/images/spotify_logo_colored.png',
    color: 'hsl(var(--platform-spotify))',
    bgColor: 'bg-platform-spotify/10',
    borderColor: 'border-platform-spotify/40',
  },
  appleMusic: {
    name: 'Apple Music',
    icon: '/images/apple_music_logo_colored.png',
    color: 'hsl(var(--platform-apple-music))',
    bgColor: 'bg-platform-apple-music/10',
    borderColor: 'border-platform-apple-music/40',
  },
  deezer: {
    name: 'Deezer',
    icon: '/images/deezer_logo_colored.png',
    color: 'hsl(var(--platform-deezer))',
    bgColor: 'bg-platform-deezer/10',
    borderColor: 'border-platform-deezer/40',
  },
  tidal: {
    name: 'Tidal',
    icon: '/images/social_images/ic_tidal.png',
    color: 'hsl(var(--platform-tidal))',
    bgColor: 'bg-platform-tidal/10',
    borderColor: 'border-platform-tidal/40',
  },
  youtubeMusic: {
    name: 'YouTube Music',
    icon: '/images/social_images/ic_yt_music.png',
    color: 'hsl(var(--platform-youtube))',
    bgColor: 'bg-platform-youtube/10',
    borderColor: 'border-platform-youtube/40',
  },
};

export const StreamingLinks: React.FC<StreamingLinksProps> = ({
  links,
  className,
  postId,
  elementType,
  sourcePlatform,
  isAuthenticated,
}) => {
  const availableLinks = Object.entries(links).filter(([, url]) => url);
  
  if (availableLinks.length === 0) {
    return null;
  }
  
  return (
    <div className={cn("w-full", className)}>
      <div className="grid gap-2.5">
        {availableLinks.map(([platform, url]) => {
          const service = streamingServices[platform];
          if (!service || !url) return null;
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const normalizedTarget =
                  platform === 'spotify' || platform === 'deezer'
                    ? platform
                    : platform === 'appleMusic'
                      ? 'apple'
                      : 'unknown';
                const normalizedSourcePlatform = normalizePlatform(sourcePlatform) ?? 'unknown';
                const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
                const conversionClickProps = buildPostPlatformConversionClickedProps({
                  sourceContext: 'destination_open_button',
                  route,
                  postId,
                  elementType,
                  targetPlatform: normalizedTarget,
                  sourcePlatform,
                  sourceDomain: url,
                  isAuthenticated,
                });
                if (conversionClickProps) {
                  void captureClientEvent('post_platform_conversion_clicked', conversionClickProps);
                }
                void captureClientEvent('streaming_link_opened', {
                  route,
                  source_surface: 'post',
                  target_platform: normalizedTarget,
                  source_platform: normalizedSourcePlatform,
                  post_id: postId,
                  element_type: elementType,
                  is_authenticated: isAuthenticated,
                  source_domain: sanitizeDomain(url),
                });
              }}
              className={cn(
                "group relative flex items-stretch overflow-hidden rounded-md",
                "border border-border bg-card text-foreground elev-1",
                "transition-colors duration-150",
                "hover:border-foreground/40 hover:bg-muted/40",
                "active:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              {/* Platform color edge */}
              <span
                aria-hidden
                className="w-1.5 shrink-0"
                style={{ background: service.color }}
              />

              <span className="flex flex-1 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
                {/* Icon */}
                <span className="relative h-4 w-4 shrink-0 sm:h-5 sm:w-5">
                  <Image
                    src={service.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </span>

                {/* Service Name */}
                <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.2em] sm:text-xs">
                  {service.name}
                </span>

                {/* Open affordance */}
                <ArrowUpRight
                  aria-hidden
                  className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};
