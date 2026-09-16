/** Slides an element from where a same-keyed element was last unmounted to where
    it mounts now, so a card that changes pages (or slots) reads as one card moving
    instead of two cards swapping. Positions are viewport-relative, so the two pages
    can scroll in different containers. */

import { useLayoutEffect, type RefObject } from 'react';

type LastPosition = { top: number; left: number; width: number; at: number };

// Module-level so the record outlives the page that wrote it during client navigation.
const lastPositions = new Map<string, LastPosition>();
const handoffWindowMs = 1_000;
const slideMs = 400;

export function useSharedPosition(ref: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = lastPositions.get(key);
    lastPositions.delete(key);
    const rect = node.getBoundingClientRect();
    const dx = previous ? previous.left - rect.left : 0;
    const dy = previous ? previous.top - rect.top : 0;
    // Uniform scale from the departure width: the heads line up, and the body can differ in height.
    const scale = previous && rect.width > 0 ? previous.width / rect.width : 1;
    const fresh = previous !== undefined && Date.now() - previous.at < handoffWindowMs;
    const wantsMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fresh && wantsMotion && (dx !== 0 || dy !== 0 || scale !== 1)) {
      node.animate(
        [
          { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
          { transformOrigin: 'top left', transform: 'none' },
        ],
        { duration: slideMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
    return () => {
      // The node is still in the document during layout cleanup, so this is the departure spot.
      const { top, left, width } = node.getBoundingClientRect();
      lastPositions.set(key, { top, left, width, at: Date.now() });
    };
  }, [ref, key]);
}
