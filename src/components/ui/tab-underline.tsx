'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function TabUnderline({ value }: { value: string }) {
  const bar = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; width: number } | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const list = bar.current?.parentElement;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-state="active"]');
      if (!active) return;
      let x = 0;
      for (let node: Element | null = active; node instanceof HTMLElement && node !== list; node = node.offsetParent) {
        x += node.offsetLeft;
      }
      setBox({ x, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (!box) return;
    // Two renders can land before the next frame. The forced style read commits the first
    // position, or the transition starts from the unstyled bar at the left edge.
    bar.current?.getBoundingClientRect();
    setSettled(true);
  }, [box]);

  return (
    <span
      ref={bar}
      aria-hidden
      className={cn(
        'pointer-events-none absolute bottom-0 left-0 h-0.5 bg-foreground ease-out-quart motion-reduce:transition-none',
        settled ? 'transition-[transform,width] duration-280' : 'transition-none',
      )}
      style={box ? { transform: `translateX(${box.x}px)`, width: box.width } : { opacity: 0 }}
    />
  );
}
