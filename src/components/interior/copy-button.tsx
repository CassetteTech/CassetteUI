'use client';

/** Copy-to-clipboard button with a layout-stable idle → copied → error crossfade.
    Adapted from interior.dev (MIT): the button reads its value lazily and uses
    Cassette's Button tokens. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CELL = { type: 'spring', stiffness: 520, damping: 34, mass: 0.45 } as const;
const CROSSFADE = { type: 'spring', stiffness: 260, damping: 34, mass: 0.8 } as const;
const DRAW = { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } as const;
const INSTANT = { duration: 0 } as const;

type CopyStatus = 'idle' | 'copied' | 'error';
const resetAfterMs = 2000;

function writeFallback(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);

  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(area);
  if (selection && previous) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
}

export function useCopyToClipboard({
  onCopy,
  onError,
}: {
  onCopy?: (value: string) => void;
  onError?: (error: Error | null) => void;
} = {}) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const [ticket, setTicket] = useState(0);

  const mounted = useRef(true);
  const copied = useRef(onCopy);
  copied.current = onCopy;
  const failed = useRef(onError);
  failed.current = onError;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const copy = useCallback(async (text: string) => {
    if (!text) return false;

    let ok = false;
    let failure: Error | null = null;

    try {
      const clipboard = globalThis.navigator?.clipboard;
      if (clipboard) {
        await clipboard.writeText(text);
        ok = true;
      } else {
        ok = writeFallback(text);
      }
    } catch (error) {
      failure = error instanceof Error ? error : null;
      try {
        ok = writeFallback(text);
      } catch {
        ok = false;
      }
    }

    if (!mounted.current) return ok;

    setStatus(ok ? 'copied' : 'error');
    setTicket((t) => t + 1);

    if (ok) copied.current?.(text);
    else failed.current?.(failure);

    return ok;
  }, []);

  useEffect(() => {
    if (ticket === 0 || status === 'idle') return;
    const id = setTimeout(() => setStatus('idle'), resetAfterMs);
    return () => clearTimeout(id);
  }, [ticket, status]);

  return { copy, status, copied: status === 'copied' };
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  errorLabel = 'Copy failed',
  className,
  onCopied,
}: {
  value: () => string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  className?: string;
  onCopied?: () => void;
}) {
  const { copy, status } = useCopyToClipboard({ onCopy: onCopied });
  const reduced = useReducedMotion();
  const fade = reduced ? INSTANT : CROSSFADE;
  const draw = reduced ? INSTANT : DRAW;
  const labels: Array<[CopyStatus, string]> = [
    ['idle', label],
    ['copied', copiedLabel],
    ['error', errorLabel],
  ];

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-live="polite"
      onClick={() => void copy(value())}
      whileTap={reduced ? undefined : { y: 1 }}
      transition={CELL}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'relative', className)}
    >
      <span className="grid size-3.5 shrink-0" aria-hidden="true">
        <motion.svg
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="col-start-1 row-start-1 size-3.5"
          initial={false}
          animate={{ opacity: status === 'idle' ? 1 : 0, scale: status === 'idle' ? 1 : 0.92 }}
          transition={fade}
        >
          <path d="M9.6 5.1V3.7A1.7 1.7 0 0 0 7.9 2H3.7A1.7 1.7 0 0 0 2 3.7v4.2a1.7 1.7 0 0 0 1.7 1.7h1.4" />
          <rect x="5.1" y="5.1" width="6.9" height="6.9" rx="1.7" />
        </motion.svg>
        <motion.svg
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="col-start-1 row-start-1 size-3.5 text-success-text"
          initial={false}
          animate={{ opacity: status === 'copied' ? 1 : 0, scale: status === 'copied' ? 1 : 0.92 }}
          transition={fade}
        >
          <motion.path
            d="M2.8 7.4 5.6 10.2 11.2 4.2"
            initial={false}
            animate={{ pathLength: status === 'copied' ? 1 : 0 }}
            transition={draw}
          />
        </motion.svg>
        <motion.svg
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          className="col-start-1 row-start-1 size-3.5 text-destructive"
          initial={false}
          animate={{ opacity: status === 'error' ? 1 : 0, scale: status === 'error' ? 1 : 0.92 }}
          transition={fade}
        >
          <path d="M7 3.4v4.2" />
          <path d="M7 10.6h.01" />
        </motion.svg>
      </span>
      <span className="grid" aria-hidden="true">
        {labels.map(([key, text]) => (
          <motion.span
            key={key}
            className="col-start-1 row-start-1 whitespace-nowrap"
            initial={false}
            animate={{ opacity: status === key ? 1 : 0, y: status === key ? 0 : 2 }}
            transition={fade}
          >
            {text}
          </motion.span>
        ))}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {labels.reduce((a, [, b]) => (b.length > a.length ? b : a), '')}
        </span>
      </span>
    </motion.button>
  );
}
