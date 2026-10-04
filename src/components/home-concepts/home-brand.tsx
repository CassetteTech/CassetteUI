'use client';

import type { ReactNode } from 'react';
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
 * wrapper trims it and the badge sits on the lettering's baseline.
 * `badge` puts the badge to the right (`inline`) or under it (`below`).
 */
export function HomeBrand({ badge = 'inline', className }: { badge?: 'inline' | 'below'; className?: string }) {
  return (
    <div className={cn('flex', badge === 'inline' ? 'flex-row items-end' : 'flex-col items-center', className)}>
      <div className={cn('min-w-0', badge === 'inline' ? 'flex-1' : 'w-full')} style={{ marginTop: '-4%', marginBottom: '-8%' }}>
        <HomeWordmark />
      </div>
      <BetaBadge className={badge === 'inline' ? '-ml-2 mb-[6%]' : 'mt-0'} />
    </div>
  );
}

/** Opens the product walkthrough. `unstyled` renders a plain button that
    takes its whole look from `className` (for coloured bands). */
export function DemoButton({
  variant = 'brutalist',
  unstyled = false,
  className,
  children,
}: {
  variant?: 'brutalist' | 'brutalist-outline' | 'ghost' | 'link';
  unstyled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const label = (
    <>
      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
      {children ?? 'Watch demo'}
    </>
  );
  return (
    <DemoVideoDialog
      title={HOMEPAGE_DEMO_VIDEO.title}
      videoSrc={HOMEPAGE_DEMO_VIDEO.videoSrc}
      videoType={HOMEPAGE_DEMO_VIDEO.videoType}
      caption={HOMEPAGE_DEMO_VIDEO.caption}
      trigger={
        unstyled ? (
          <button type="button" className={className}>{label}</button>
        ) : (
          <Button type="button" variant={variant} className={cn('gap-2 px-4 py-2 h-auto', className)}>
            {label}
          </Button>
        )
      }
    />
  );
}
