import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { streamingServices } from './streaming-links';

interface PlaylistStreamingLinksProps {
  links: {
    spotify?: string; // existing base playlist URL when available
    appleMusic?: string;
    deezer?: string;
  };
  className?: string;
}

// Buttons always rendered for playlists: Spotify, Apple Music, Deezer
const PLATFORMS: Array<'spotify' | 'appleMusic' | 'deezer'> = [
  'spotify',
  'appleMusic',
  'deezer',
];

export const PlaylistStreamingLinks: React.FC<PlaylistStreamingLinksProps> = ({ links, className }) => {
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
          const url = links[platform];
          const service = streamingServices[platform];
          if (!service) return null;

          // If we have a URL, render as anchor; otherwise, render as a disabled button for now
          const commonClasses = cn(
            'group relative flex items-center justify-center',
            'px-4 py-2.5 rounded-full transition-all duration-200',
            'border-2 border-foreground/60 text-foreground',
            'bg-card/80 hover:bg-card text-sm font-medium backdrop-blur-sm',
            url ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : 'opacity-70 cursor-default',
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
              <span className="whitespace-nowrap">Open in {service.name}</span>
            </a>
          ) : (
            <button
              key={platform}
              type="button"
              className={commonClasses}
              onClick={() => {
                // Placeholder action; to be wired to an API call later
              }}
            >
              <div className="relative w-4 h-4 mr-2">
                <Image src={service.icon} alt={service.name} width={16} height={16} className="object-contain" />
              </div>
              <span className="whitespace-nowrap">Open in {service.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


