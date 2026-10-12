'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { HomeWordmark } from '@/components/pages/home-wordmark';
import { StageHoverCard } from '@/components/features/stage-hover-card';
import { DemoVideoDialog } from '@/components/demo/demo-video-dialog';
import { Button } from '@/components/ui/button';
import { HOMEPAGE_DEMO_VIDEO } from '@/lib/marketing-copy';
import { cn } from '@/lib/utils';

/** The beta badge that follows the wordmark everywhere. */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <div className={cn('home-wordmark-badge shrink-0', className)}>
      <StageHoverCard>
        <span className="font-teko font-black text-base sm:text-lg lg:text-xl tracking-wide [-webkit-text-fill-color:#FFFFFF] [-webkit-text-stroke:3.5px_#3B3E41] [paint-order:stroke_fill] cursor-pointer">
          beta.
        </span>
      </StageHoverCard>
    </div>
  );
}

/**
 * The folding wordmark with its beta badge. The SVG box carries empty
 * space above and below the lettering (its extrusion travel), so the
 * wrapper trims it and the badge sits at the foot of the extrusion.
 */
export function HomeBrand({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-row items-end', className)}>
      <div className="min-w-0 flex-1" style={{ marginTop: '-4%', marginBottom: '-8%' }}>
        <HomeWordmark />
      </div>
      <BetaBadge className="-ml-2" />
    </div>
  );
}

/** The streaming services Cassette converts between, with their logos. */
export const STREAMING_SERVICES = [
  { label: 'Spotify', logo: '/images/spotify_logo_colored.png' },
  { label: 'Apple Music', logo: '/images/apple_music_logo_colored.png' },
  { label: 'Deezer', logo: '/images/deezer_logo_colored.png' },
] as const;

const CURATOR_STUDIO = '/studio';

/** The curator call to action. A new visitor signs up first, then lands in
    Curator Studio, where the free page starts with one click. */
export function StartPageLink({ isAuthenticated, className }: { isAuthenticated: boolean; className?: string }) {
  const href = isAuthenticated ? CURATOR_STUDIO : `/auth/signup?redirect=${encodeURIComponent(CURATOR_STUDIO)}`;
  return (
    <Button asChild variant="brutalist" className={cn('h-auto px-5 py-2.5 text-[11px]', className)}>
      <Link href={href}>Start your free page</Link>
    </Button>
  );
}

/** Opens the product walkthrough. */
export function DemoButton() {
  return (
    <DemoVideoDialog
      title={HOMEPAGE_DEMO_VIDEO.title}
      videoSrc={HOMEPAGE_DEMO_VIDEO.videoSrc}
      videoType={HOMEPAGE_DEMO_VIDEO.videoType}
      caption={HOMEPAGE_DEMO_VIDEO.caption}
      trigger={
        <Button type="button" variant="brutalist" className="h-auto gap-2 px-4 py-2">
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          Watch demo
        </Button>
      }
    />
  );
}
