'use client';

/** A loading message: a turning orb in brand red, coral, and amber beside letters that brighten
    in a wave. Adapted from opensourceui.in's text-loader (MIT, Copyright (c) 2026 Bidyut Kundu):
    one Cassette color scheme, text in the current color, spaces kept, a wave that stays readable
    at its dimmest, and a status that screen readers read as plain text. Reduced motion holds the
    orb still and the letters solid. */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const orbMiddle = '#7c0d22';
const orbShadows = [
  '0 1px 1px 0 #fff inset, 0 3px 5px 0 #fb7185 inset, 0 4px 4px 0 #e22645 inset',
  '0 1px 1px 0 #fff inset, 0 3px 5px 0 #e22645 inset, 0 4px 4px 0 #fbbf24 inset',
  '0 1px 1px 0 #fff inset, 0 3px 5px 0 #fb923c inset, 0 4px 4px 0 #fda4af inset',
] as const;

function TextLoaderOrb() {
  const orb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = orb.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.backgroundColor = orbMiddle;
      node.style.boxShadow = orbShadows[1];
      return;
    }
    const animation = node.animate(
      [
        { transform: 'rotate(90deg)', backgroundColor: 'transparent', boxShadow: orbShadows[0] },
        { transform: 'rotate(270deg)', backgroundColor: orbMiddle, boxShadow: orbShadows[1], offset: 0.5 },
        { transform: 'rotate(450deg)', backgroundColor: 'transparent', boxShadow: orbShadows[2] },
      ],
      { duration: 1500, iterations: Infinity, easing: 'linear' },
    );
    return () => animation.cancel();
  }, []);

  return <span ref={orb} aria-hidden className="size-5 shrink-0 rounded-full" style={{ transform: 'rotate(90deg)' }} />;
}

export function TextLoader({ text = 'Loading', className }: { text?: string; className?: string }) {
  return (
    <output className={cn('flex select-none items-center justify-center gap-2.5', className)}>
      <TextLoaderOrb />
      <span className="sr-only">{text}</span>
      <span aria-hidden className="flex gap-px whitespace-pre">
        {Array.from(text, (letter, index) => (
          <span
            key={index}
            className="animate-letter-wave opacity-60 motion-reduce:animate-none motion-reduce:opacity-100"
            style={{ animationDelay: `${index * 0.09}s` }}
          >
            {letter}
          </span>
        ))}
      </span>
    </output>
  );
}
