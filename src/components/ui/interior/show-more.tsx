"use client";

import { useCallback, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "framer-motion";

type Metrics = { line: number; full: number };

export type UseShowMoreOptions = {
  lines?: number;
};

export type UseShowMoreResult = {
  contentRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  toggle: () => void;
  height: number | null;
  expandable: boolean;
};

export function useShowMore({
  lines = 3,
}: UseShowMoreOptions = {}): UseShowMoreResult {
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const read = () => {
      const styles = getComputedStyle(el);
      const parsed = Number.parseFloat(styles.lineHeight);
      const line = Number.isFinite(parsed)
        ? parsed
        : Number.parseFloat(styles.fontSize) * 1.5;
      const full = el.scrollHeight;

      setMetrics((prev) =>
        prev && prev.line === line && prev.full === full
          ? prev
          : { line, full },
      );
    };

    read();

    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clamped = metrics ? metrics.line * lines : 0;
  const expandable = metrics ? metrics.full - clamped > 1 : true;
  const open = expanded && expandable;

  return {
    contentRef,
    open,
    toggle,
    height: metrics ? (open ? metrics.full : Math.min(clamped, metrics.full)) : null,
    expandable,
  };
}
