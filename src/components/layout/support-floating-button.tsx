'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';
import { cn } from '@/lib/utils';

// Ignore scroll deltas smaller than this so rubber-banding and momentum
// jitter don't toggle the button.
const SCROLL_JITTER_PX = 8;
// Never hide within this distance of the top of the page.
const TOP_REVEAL_PX = 120;

export function SupportFloatingButton() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (Math.abs(delta) < SCROLL_JITTER_PX) return;
      setHidden(delta > 0 && y > TOP_REVEAL_PX);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={openKoFiSupport}
      className={cn(
        'group fixed left-4 z-[60] flex h-12 items-center rounded-full bg-primary px-[14px] text-primary-foreground shadow-lg shadow-primary/30 transition-[transform,opacity,background-color] duration-300 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]',
        hidden && 'pointer-events-none translate-y-[200%] opacity-0'
      )}
      aria-label="Support Cassette on Ko-fi"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
    >
      <Image src={KOFI_ICON_SRC} alt="" width={20} height={20} className="shrink-0" />
      {/* Label tucks away; slides open on hover/keyboard focus */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width,padding] duration-300 group-hover:max-w-32 group-hover:pl-2 group-focus-visible:max-w-32 group-focus-visible:pl-2">
        Support Us
      </span>
    </button>
  );
}
