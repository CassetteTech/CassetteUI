import React from 'react';
import Image from 'next/image';
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
    color: '#1DB954',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
  },
  appleMusic: {
    name: 'Apple Music',
    icon: '/images/apple_music_logo_colored.png',
    color: '#FC3C44',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
  },
  deezer: {
    name: 'Deezer',
    icon: '/images/deezer_logo_colored.png',
    color: '#FF6B3D',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
  },
  tidal: {
    name: 'Tidal',
    icon: '/images/social_images/ic_tidal.png',
    color: '#000000',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-600',
  },
  youtubeMusic: {
    name: 'YouTube Music',
    icon: '/images/social_images/ic_yt_music.png',
    color: '#FF0000',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
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
    <div className={cn(
      "p-3 sm:p-4 md:p-6 rounded-2xl bg-text-primary/5 border border-text-primary/10",
      "shadow-sm backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-wrap gap-2 justify-center">
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
                "group relative flex items-center justify-center",
                "px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all duration-200",
                "hover:scale-105 hover:shadow-lg",
                "border-2 border-foreground/60 text-foreground",
                "bg-card/80 hover:bg-card",
                "text-sm font-medium backdrop-blur-sm"
              )}
            >
              {/* Icon */}
              <div className="relative w-4 h-4 mr-2">
                <Image
                  src={service.icon}
                  alt={service.name}
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
              
              {/* Service Name */}
              <span className="whitespace-nowrap">
                Open in {service.name}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};
