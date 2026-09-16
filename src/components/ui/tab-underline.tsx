'use client';

/** Sliding underline for an underline-style Radix TabsList. Rendered as the
    first child of the list, it measures the active trigger and tweens
    transform and width between tabs (the transitions.dev tabs-sliding recipe).
    The first position is written without a transition, so the bar never grows
    in from the left edge. Reduced motion snaps. The list must be
    `position: relative`. */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function TabUnderline({ value }: { value: string }) {
  const bar = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; width: number } | null>(null);
  // True once a resting position has painted; only then do moves tween.
  const [settled, setSettled] = useState(false);

  // A passive effect: the list and its triggers are committed and measurable by then.
  useEffect(() => {
    const list = bar.current?.parentElement;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-state="active"]');
      if (active) setBox({ x: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (box) setSettled(true);
  }, [box]);

  return (
    <span
      ref={bar}
      aria-hidden
      className={cn(
        'pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary ease-out-quart motion-reduce:transition-none',
        settled ? 'transition-[transform,width] duration-280' : 'transition-none',
      )}
      style={box ? { transform: `translateX(${box.x}px)`, width: box.width } : { opacity: 0 }}
    />
  );
}
