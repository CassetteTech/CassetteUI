'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScrollFadeProps {
  children: React.ReactNode;
  /** Outer wrapper — the positioning context for the fade overlays. */
  className?: string;
  /** Scroll container — put height/max-height and scrollbar styling here. */
  scrollClassName?: string;
  /** Gradient start color for both fades; must match the surface behind the rows. */
  fadeClassName?: string;
  /** Exposes the scroll container element (e.g. as an IntersectionObserver root). */
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
}

/**
 * Scroll container that signals clipped content with gradient fades at its
 * edges. Each fade is visible only while more content exists in that
 * direction, driven by 1px sentinels and an IntersectionObserver rather than
 * scroll listeners.
 */
export const ScrollFade: React.FC<ScrollFadeProps> = ({
  children,
  className,
  scrollClassName,
  fadeClassName = 'from-card',
  scrollRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const rootEl = containerRef.current;
    const topEl = topSentinelRef.current;
    const bottomEl = bottomSentinelRef.current;
    if (!rootEl || !topEl || !bottomEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topEl) setAtTop(entry.isIntersecting);
          if (entry.target === bottomEl) setAtBottom(entry.isIntersecting);
        }
      },
      { root: rootEl }
    );
    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn('relative min-h-0', className)}>
      <div
        ref={(el) => {
          containerRef.current = el;
          if (scrollRef) scrollRef.current = el;
        }}
        className={cn('overflow-y-auto overscroll-contain', scrollClassName)}
      >
        <div ref={topSentinelRef} aria-hidden className="h-px w-full" />
        {children}
        <div ref={bottomSentinelRef} aria-hidden className="h-px w-full" />
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b to-transparent transition-opacity duration-300',
          fadeClassName,
          atTop ? 'opacity-0' : 'opacity-100'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t to-transparent transition-opacity duration-300',
          fadeClassName,
          atBottom ? 'opacity-0' : 'opacity-100'
        )}
      />
    </div>
  );
};
