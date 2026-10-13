/** Slides an element from where a same-keyed element was last unmounted to where
    it mounts now, so a card that changes pages (or slots) reads as one card moving
    instead of two cards swapping. Positions are viewport-relative, so the two pages
    can scroll in different containers. Descendants marked `data-shared-tint="<part>"`
    also blend their colors and opacity from the same part of the departing element,
    so a muted pass that hands off to a brand-red one changes color as it moves, and
    descendants marked `data-shared-size="<part>"` ease their size and type size, so a
    larger photo or name on one page shrinks or grows into the other instead of jumping.

    A page whose copy waits on a data read calls `useSharedPositionHold`: the departing
    element stays on screen as an inert copy, moves to the slot the new copy will fill,
    and dissolves into the new copy when it mounts, so a slow first visit still reads
    as one card. */

import { useLayoutEffect, type RefObject } from 'react';

type PartStyle = Record<string, string>;
type LastPosition = {
  top: number;
  left: number;
  width: number;
  at: number;
  /** Computed styles of the shared parts, by kind and part name. */
  parts: Map<string, PartStyle>;
  /** The departing element, held on screen while a page waits for its copy. */
  held: HTMLElement | null;
  /** Whether the held copy was painted, so taking it away is a change on screen. */
  shown: boolean;
};

// Module-level so the record outlives the page that wrote it during client navigation.
const lastPositions = new Map<string, LastPosition>();
// Keys already recorded in the current commit. The first departure wins: a pass portaled into
// a slot leaves before the fallback pass that CSS hid while the slot was full, and that
// fallback is visible only because the slot just emptied.
const departedThisCommit = new Set<string>();
// Keys whose next copy is still loading, with the number of holders.
const holds = new Map<string, number>();
// Slots a copy is still loading into, with the number of holders. While any wait, the slot carries
// `data-shared-pending`, so content after the slot can stay hidden instead of moving down when the copy lands.
const pendingSlots = new WeakMap<HTMLElement, number>();

function markPending(slot: HTMLElement, change: 1 | -1) {
  const count = (pendingSlots.get(slot) ?? 0) + change;
  if (count > 0) pendingSlots.set(slot, count);
  else pendingSlots.delete(slot);
  slot.toggleAttribute('data-shared-pending', count > 0);
}
const handoffWindowMs = 1_000;
// A held copy never outstays this; a read that slow lets the new copy simply appear.
const maxHoldMs = 5_000;
const slideMs = 400;
const releaseMs = 150;
const dissolveMs = 180;
const slideEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

// The properties each kind of shared part carries over a handoff, and how it eases: colors ease
// in and out, sizes ease like the slide.
const sharedKinds = [
  { attribute: 'data-shared-tint', properties: ['backgroundColor', 'color', 'opacity'], easing: 'ease-in-out' },
  { attribute: 'data-shared-size', properties: ['width', 'height', 'fontSize', 'lineHeight'], easing: slideEasing },
] as const;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Shared parts with their computed styles. The id is also the selector for the same part elsewhere. */
function sharedParts(node: Element) {
  return sharedKinds.flatMap(({ attribute, properties, easing }) =>
    [...node.querySelectorAll(`[${attribute}]`)].map((part) => {
      const computed = getComputedStyle(part);
      const style = Object.fromEntries(properties.map((property) => [property, computed[property]]));
      return { part, id: `[${attribute}="${part.getAttribute(attribute)}"]`, style, easing };
    }));
}

/** Keyframes from a departed part's style to its counterpart's, with only the properties that differ. */
function partChange(from: PartStyle | undefined, to: PartStyle) {
  if (!from) return null;
  const changed = Object.keys(to).filter((property) => from[property] !== to[property]);
  if (changed.length === 0) return null;
  const pick = (style: PartStyle) => Object.fromEntries(changed.map((property) => [property, style[property]]));
  return [pick(from), pick(to)];
}

/** Animates `element` from a spot to where it is now, with the top-left corners matched. */
function slideFrom(element: HTMLElement, dx: number, dy: number, scale: number) {
  if (dx === 0 && dy === 0 && scale === 1) return null;
  return element.animate(
    [
      { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      { transformOrigin: 'top left', transform: 'none' },
    ],
    { duration: slideMs, easing: slideEasing },
  );
}

/** An inert, fixed copy of the departing element at its last spot. */
function holdCopy(node: HTMLElement, top: number, left: number, width: number) {
  // SAFETY: a deep clone of an HTMLElement is an HTMLElement of the same tag.
  const copy = node.cloneNode(true) as HTMLElement;
  // The copy is decoration: no duplicate ids or test hooks, and nothing to focus or read.
  for (const element of [copy, ...copy.querySelectorAll('[id], [data-testid]')]) {
    element.removeAttribute('id');
    element.removeAttribute('data-testid');
  }
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  Object.assign(copy.style, { position: 'fixed', margin: '0', zIndex: '40', pointerEvents: 'none' });
  placeCopy(copy, top, left, width);
  document.body.append(copy);
  return copy;
}

function placeCopy(copy: HTMLElement, top: number, left: number, width: number) {
  Object.assign(copy.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });
}

/** Drops a held copy that no page is waiting on. One that was on screen fades; the record goes with it. */
function releaseHeld(key: string, entry: LastPosition, force = false) {
  if (lastPositions.get(key) !== entry || !entry.held || (!force && holds.has(key))) return;
  const { held } = entry;
  entry.held = null;
  if (!entry.shown) {
    // Never painted: leave the position record for a copy that mounts within the handoff window.
    held.remove();
    return;
  }
  lastPositions.delete(key);
  const fade = held.animate([{ opacity: 1 }, { opacity: 0 }], { duration: releaseMs, easing: 'ease-out', fill: 'forwards' });
  fade.onfinish = () => held.remove();
}

// Elements whose handoff started in the current task, with what it consumed and started.
const arriving = new Map<HTMLElement, { previous: LastPosition; animations: Animation[] }>();

export function useSharedPosition(ref: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = lastPositions.get(key);
    lastPositions.delete(key);
    // A copy that was never painted is the old card's last frame; the new card replaces it as before.
    if (previous?.held && !previous.shown) previous.held.remove();
    const held = previous?.shown ? previous.held : null;
    // A held copy is still on screen, so its handoff is fresh however long the read took.
    const fresh = previous !== undefined && (held !== null || Date.now() - previous.at < handoffWindowMs);
    if (fresh && !reducedMotion()) {
      const animations: Animation[] = [];
      // The handoff is this element's entrance. A fade-in on its slot would hide the slide and the
      // blend, so finish it, and measure afterwards so its offset is not part of the slide.
      for (const entrance of node.parentElement?.getAnimations() ?? []) entrance.finish();
      let from: { top: number; left: number; width: number } = previous;
      if (held) {
        // A held copy can still be moving to the slot: start from where it is on screen, and pin it there.
        from = held.getBoundingClientRect();
        for (const animation of held.getAnimations()) animation.cancel();
        placeCopy(held, from.top, from.left, from.width);
      }
      const rect = node.getBoundingClientRect();
      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      // Uniform scale from the departure width: the heads line up, and the body can differ in height.
      const scale = rect.width > 0 ? from.width / rect.width : 1;
      const slide = slideFrom(node, dx, dy, scale);
      if (slide) animations.push(slide);
      // Shared parts change across the slide. A held copy's matching parts make the same change,
      // so the two cards stay in step while it fades.
      for (const { part, id, style, easing } of sharedParts(node)) {
        const keyframes = partChange(previous.parts.get(id), style);
        if (!keyframes) continue;
        animations.push(part.animate(keyframes, { duration: slideMs, easing }));
        const heldPart = held?.querySelector(id);
        if (heldPart) animations.push(heldPart.animate(keyframes, { duration: slideMs, easing, fill: 'forwards' }));
      }
      if (held) {
        // The held copy was on screen while the page loaded, so the two cards cross-fade: the copy
        // rides the slide on top and fades out with a blur that hides the two layouts overlapping,
        // while the head color blends underneath.
        animations.push(held.animate(
          [{ transform: 'none' }, { transform: `translate(${-dx}px, ${-dy}px) scale(${1 / scale})` }],
          { duration: slideMs, easing: slideEasing, fill: 'forwards' },
        ));
        const fade = held.animate(
          [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(4px)' }],
          { duration: dissolveMs, easing: 'ease-out', fill: 'forwards' },
        );
        fade.onfinish = () => held.remove();
        // The new card comes up under it, so a taller card's lower part does not appear at once.
        animations.push(fade, node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dissolveMs, easing: 'ease-out' }));
      }
      arriving.set(node, { previous, animations });
      queueMicrotask(() => arriving.delete(node));
    } else {
      held?.remove();
    }
    return () => {
      // Strict Mode runs the effect again at once: undo this handoff and hand the record back for the rerun.
      const handoff = arriving.get(node);
      if (handoff) {
        arriving.delete(node);
        for (const animation of handoff.animations) animation.cancel();
        lastPositions.set(key, handoff.previous);
        return;
      }
      if (departedThisCommit.has(key)) return;
      // The node is still in the document during layout cleanup, so this is the departure spot.
      const { top, left, width } = node.getBoundingClientRect();
      // A copy that CSS hides (display: none) has no spot to hand off from.
      if (width === 0) return;
      departedThisCommit.add(key);
      // React runs a commit's cleanups in one task, so a microtask clears the set after it.
      queueMicrotask(() => departedThisCommit.delete(key));
      const parts = new Map(sharedParts(node).map(({ id, style }) => [id, style]));
      const entry: LastPosition = {
        top, left, width, at: Date.now(), parts, shown: false,
        held: reducedMotion() ? null : holdCopy(node, top, left, width),
      };
      lastPositions.set(key, entry);
      if (!entry.held) return;
      // A hold or a new copy lands in this same commit, before the next frame. Without either,
      // the copy goes before it is ever painted, so other navigations look as they did.
      requestAnimationFrame(() => {
        releaseHeld(key, entry);
        entry.shown = entry.held !== null;
      });
      setTimeout(() => releaseHeld(key, entry, true), maxHoldMs);
    };
  }, [ref, key]);
}

const following = new WeakSet<LastPosition>();

/** Keeps a held copy on its slot each frame while the page scrolls or resizes, and lets it go
    when the slot loses its box (a narrow window hides the empty rail). */
function followSlot(key: string, entry: LastPosition, slot: HTMLElement) {
  if (following.has(entry)) return;
  following.add(entry);
  const step = () => {
    if (lastPositions.get(key) !== entry || !entry.held) return;
    const target = slot.getBoundingClientRect();
    if (target.width === 0) {
      releaseHeld(key, entry, true);
      return;
    }
    if (target.top !== entry.top || target.left !== entry.left || target.width !== entry.width) {
      placeCopy(entry.held, target.top, target.left, target.width);
      Object.assign(entry, { top: target.top, left: target.left, width: target.width });
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Keeps the departing `key` element on screen while `waiting`, for a page that renders its
    copy only after a data read. With a `slot`, the held copy moves to the slot's top-left
    corner and takes its width; a slot that has no box (hidden at this width) lets the copy
    go. While a holder waits, its slot carries `data-shared-pending`, also on a visit with no
    copy to hold. Several holders can wait on one key; the copy goes when the last one stops
    waiting without a copy mounting. */
export function useSharedPositionHold(key: string, waiting: boolean, slot: HTMLElement | null) {
  useLayoutEffect(() => {
    if (!waiting) return;
    holds.set(key, (holds.get(key) ?? 0) + 1);
    if (slot) markPending(slot, 1);
    const entry = lastPositions.get(key);
    if (entry?.held && slot) {
      const target = slot.getBoundingClientRect();
      if (target.width === 0) {
        releaseHeld(key, entry, true);
      } else {
        if (target.top !== entry.top || target.left !== entry.left || target.width !== entry.width) {
          // Move now, so the card answers the click; the new copy later lands on this spot.
          placeCopy(entry.held, target.top, target.left, target.width);
          slideFrom(entry.held, entry.left - target.left, entry.top - target.top, entry.width / target.width);
          Object.assign(entry, { top: target.top, left: target.left, width: target.width });
        }
        followSlot(key, entry, slot);
      }
    }
    return () => {
      const count = (holds.get(key) ?? 1) - 1;
      if (count > 0) holds.set(key, count);
      else holds.delete(key);
      if (slot) markPending(slot, -1);
      // The copy usually mounts in the commit that ends the wait, after this cleanup; let it claim the record first.
      requestAnimationFrame(() => {
        const current = lastPositions.get(key);
        if (current) releaseHeld(key, current);
      });
    };
  }, [key, waiting, slot]);
}
