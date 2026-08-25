"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  useIsomorphicLayoutEffect,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

const CROSSFADE = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 0.8,
} as const;

const WALL = {
  type: "spring",
  stiffness: 700,
  damping: 30,
  mass: 0.5,
} as const;

const WALL_IMPULSE = 900;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

type DragInfo = {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
};

export type UseSnapCarouselOptions = {
  count: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  gap?: number;
  momentum?: number;
  maxFlick?: number;
  disabled?: boolean;
};

export function useSnapCarousel({
  count,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  gap = 12,
  momentum = 0.14,
  maxFlick = 1,
  disabled = false,
}: UseSnapCarouselOptions) {
  const total = Math.max(1, Math.floor(count));

  const [uncontrolled, setUncontrolled] = useState(() =>
    clamp(defaultIndex, 0, total - 1),
  );
  const [slideWidth, setSlideWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const index = clamp(controlled ?? uncontrolled, 0, total - 1);
  const step = slideWidth + gap;

  const viewportRef = useRef<HTMLDivElement>(null);
  const anim = useRef<{ stop: () => void } | null>(null);
  const desired = useRef<number | null>(null);
  const lastStep = useRef(0);

  const live = useRef(index);
  live.current = index;
  const metrics = useRef({ step, total, momentum, maxFlick });
  metrics.current = { step, total, momentum, maxFlick };
  const changed = useRef(onIndexChange);
  changed.current = onIndexChange;

  const x = useMotionValue(0);
  const reduced = useReducedMotion();

  const glide = useCallback(
    (to: number, velocity = 0) => {
      desired.current = to;
      anim.current?.stop();
      anim.current = animate(
        x,
        to,
        reduced ? { duration: 0 } : { ...CROSSFADE, velocity },
      );
    },
    [x, reduced],
  );

  const goTo = useCallback(
    (next: number, velocity = 0) => {
      const shelf = metrics.current;
      const to = clamp(Math.round(next), 0, shelf.total - 1);
      if (to !== live.current) {
        live.current = to;
        setUncontrolled(to);
        changed.current?.(to);
      }
      glide(-to * shelf.step, velocity);
    },
    [glide],
  );

  const bounce = useCallback(
    (dir: 1 | -1) => {
      const shelf = metrics.current;
      const to = -live.current * shelf.step;
      desired.current = to;
      anim.current?.stop();
      anim.current = animate(
        x,
        to,
        reduced ? { duration: 0 } : { ...WALL, velocity: -dir * WALL_IMPULSE },
      );
    },
    [x, reduced],
  );

  const move = useCallback(
    (dir: 1 | -1) => {
      const to = live.current + dir;
      if (to < 0 || to > metrics.current.total - 1) bounce(dir);
      else goTo(to);
    },
    [bounce, goTo],
  );

  const next = useCallback(() => move(1), [move]);
  const prev = useCallback(() => move(-1), [move]);

  const pick = useCallback(
    (velocity: number) => {
      const shelf = metrics.current;
      if (shelf.step === 0) return live.current;
      const at = -x.get() / shelf.step;
      const anchor = clamp(Math.round(at), 0, shelf.total - 1);
      const projected = at - (velocity * shelf.momentum) / shelf.step;
      return clamp(
        clamp(
          Math.round(projected),
          anchor - shelf.maxFlick,
          anchor + shelf.maxFlick,
        ),
        0,
        shelf.total - 1,
      );
    },
    [x],
  );

  useIsomorphicLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setSlideWidth((current) =>
        Math.abs(current - width) < 0.5 ? current : width,
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (step === 0) return;
    const to = -index * step;

    if (lastStep.current !== step) {
      lastStep.current = step;
      desired.current = to;
      anim.current?.stop();
      x.set(to);
      return;
    }
    if (dragging || desired.current === to) return;
    glide(to);
  }, [index, step, dragging, glide, x]);

  useEffect(() => () => anim.current?.stop(), []);

  const onDragStart = useCallback(() => {
    anim.current?.stop();
    setDragging(true);
  }, []);

  const onDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: DragInfo) => {
      setDragging(false);
      goTo(pick(info.velocity.x), info.velocity.x);
    },
    [goTo, pick],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(metrics.current.total - 1);
      }
    },
    [goTo, next, prev],
  );

  const onScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    event.currentTarget.scrollLeft = 0;
    event.currentTarget.scrollTop = 0;
  }, []);

  const viewportProps = {
    tabIndex: 0,
    role: "group" as const,
    "aria-roledescription": "carousel",
    onKeyDown,
    onScroll,
  };

  const trackProps = {
    drag: (disabled || total < 2 ? false : "x") as false | "x",
    dragDirectionLock: true,
    dragMomentum: false,
    dragElastic: 0.14,
    dragConstraints: { left: -(total - 1) * step, right: 0 },
    onDragStart,
    onDragEnd,
    style: { x, gap: `${gap}px`, touchAction: "pan-y" as const },
  };

  return {
    index,
    count: total,
    dragging,
    step,
    x,
    goTo,
    next,
    prev,
    viewportRef,
    viewportProps,
    trackProps,
  };
}

export type UseSnapCarouselResult = ReturnType<typeof useSnapCarousel>;

