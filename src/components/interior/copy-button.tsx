'use client';

/** Copy-to-clipboard button with a layout-stable idle → copied → error crossfade.
    Adapted from interior.dev (MIT): the hook reads its value lazily and the
    styled button uses Cassette's Button tokens. */

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CELL = { type: 'spring', stiffness: 520, damping: 34, mass: 0.45 } as const;
const CROSSFADE = { type: 'spring', stiffness: 260, damping: 34, mass: 0.8 } as const;
const DRAW = { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } as const;
const INSTANT = { duration: 0 } as const;

type CopyStatus = 'idle' | 'copied' | 'error';
const resetAfterMs = 2000;

function writeClipboard(value: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;
  return clipboard ? clipboard.writeText(value) : Promise.reject(new Error('Clipboard is unavailable'));
}

function useCopyToClipboard() {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const [ticket, setTicket] = useState(0);

  const copy = useCallback(async (read: () => string) => {
    try {
      await writeClipboard(read());
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    // A fresh ticket restarts the reset timer even when the status is unchanged.
    setTicket((t) => t + 1);
  }, []);

  useEffect(() => {
    if (ticket === 0 || status === 'idle') return;
    const id = setTimeout(() => setStatus('idle'), resetAfterMs);
    return () => clearTimeout(id);
  }, [ticket, status]);

  return { copy, status };
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  errorLabel = 'Copy failed',
  className,
}: {
  /** Read on click, so callers can build the text from window.location. */
  value: () => string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  className?: string;
}) {
  const { copy, status } = useCopyToClipboard();
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
      onClick={() => void copy(value)}
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
      {/* All labels stay mounted in one grid cell, so the button never changes width. */}
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
        {/* Reserve the widest label's width. */}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {labels.reduce((a, [, b]) => (b.length > a.length ? b : a), '')}
        </span>
      </span>
    </motion.button>
  );
}
