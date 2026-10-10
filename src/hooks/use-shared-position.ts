/** Slides an element from where a same-keyed element was last unmounted to where
    it mounts now, so a card that changes pages (or slots) reads as one card moving
    instead of two cards swapping. Positions are viewport-relative, so the two pages
    can scroll in different containers. Descendants marked `data-shared-tint="<part>"`
    also blend their colors and opacity from the same part of the departing element,
    so a muted pass that hands off to a brand-red one changes color as it moves. */

import { useLayoutEffect, type RefObject } from 'react';

const tintProperties = ['backgroundColor', 'color', 'opacity'] as const;
type Tint = Record<(typeof tintProperties)[number], string>;
type LastPosition = { top: number; left: number; width: number; at: number; tints: Map<string, Tint> };

// Module-level so the record outlives the page that wrote it during client navigation.
const lastPositions = new Map<string, LastPosition>();
// Keys already recorded in the current commit. The first departure wins: a pass portaled into
// a slot leaves before the fallback pass that CSS hid while the slot was full, and that
// fallback is visible only because the slot just emptied.
const departedThisCommit = new Set<string>();
const handoffWindowMs = 1_000;
const slideMs = 400;

function tintedParts(node: HTMLElement) {
  return [...node.querySelectorAll<HTMLElement>('[data-shared-tint]')].map((part) => {
    const style = getComputedStyle(part);
    const tint = { backgroundColor: style.backgroundColor, color: style.color, opacity: style.opacity };
    return { part, name: part.dataset.sharedTint ?? '', tint };
  });
}

export function useSharedPosition(ref: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = lastPositions.get(key);
    lastPositions.delete(key);
    const fresh = previous !== undefined && Date.now() - previous.at < handoffWindowMs;
    if (fresh && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // The handoff is this element's entrance. A fade-in on its slot would hide the slide and the
      // blend, so finish it, and measure afterwards so its offset is not part of the slide.
      for (const entrance of node.parentElement?.getAnimations() ?? []) entrance.finish();
      const rect = node.getBoundingClientRect();
      const dx = previous.left - rect.left;
      const dy = previous.top - rect.top;
      // Uniform scale from the departure width: the heads line up, and the body can differ in height.
      const scale = rect.width > 0 ? previous.width / rect.width : 1;
      if (dx !== 0 || dy !== 0 || scale !== 1) {
        node.animate(
          [
            { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
            { transformOrigin: 'top left', transform: 'none' },
          ],
          { duration: slideMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
      // The blend is a change on screen, so it eases in and out across the slide.
      for (const { part, name, tint } of tintedParts(node)) {
        const from = previous.tints.get(name);
        if (from && tintProperties.some((property) => from[property] !== tint[property])) {
          part.animate([from, tint], { duration: slideMs, easing: 'ease-in-out' });
        }
      }
    }
    return () => {
      if (departedThisCommit.has(key)) return;
      // The node is still in the document during layout cleanup, so this is the departure spot.
      const { top, left, width } = node.getBoundingClientRect();
      // A copy that CSS hides (display: none) has no spot to hand off from.
      if (width === 0) return;
      departedThisCommit.add(key);
      // React runs a commit's cleanups in one task, so a microtask clears the set after it.
      queueMicrotask(() => departedThisCommit.delete(key));
      const tints = new Map(tintedParts(node).map(({ name, tint }) => [name, tint]));
      lastPositions.set(key, { top, left, width, at: Date.now(), tints });
    };
  }, [ref, key]);
}
