'use client';

/** Checklist with animated done / active / pending markers and a spoken summary.
    Adapted from interior.dev (MIT). Changes: each step carries its own `done`
    flag (Cassette's launch steps can finish out of order), rows can be
    selected, and colors come from Cassette tokens. */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const POP = { type: 'spring', stiffness: 640, damping: 22, mass: 0.7 } as const;
const STILL = { duration: 0 } as const;

export type TaskStep = { id: string; label: string; done: boolean };

type TaskStepStatus = 'pending' | 'active' | 'done';

function useTaskSteps(steps: TaskStep[]) {
  const current = steps.findIndex((step) => !step.done);
  const complete = current === -1;
  const rows = steps.map((step, i) => {
    const status: TaskStepStatus = step.done ? 'done' : i === current ? 'active' : 'pending';
    return { ...step, status };
  });
  const doneCount = steps.filter((step) => step.done).length;
  const sentence = complete
    ? `All ${steps.length} steps complete`
    : `${steps[current].label}, ${doneCount} of ${steps.length} done`;
  return { rows, complete, current, doneCount, sentence };
}

const Tick = (
  <svg viewBox="0 0 256 256" width="11" height="11" fill="none" aria-hidden>
    <polyline
      points="216 72 104 184 48 128"
      stroke="currentColor"
      strokeWidth="26"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function TaskSteps({ steps, label = 'Progress', onSelect, className }: {
  steps: TaskStep[];
  label?: string;
  /** Makes each row a button; receives the step id. */
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const { rows, complete, sentence } = useTaskSteps(steps);
  const reduced = useReducedMotion() === true;

  // Debounced so a burst of state changes announces once.
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSpoken(sentence), 500);
    return () => clearTimeout(t);
  }, [sentence]);

  return (
    <div className={cn('w-full', className)}>
      <ol aria-label={label} className="space-y-0.5">
        {rows.map((row) => {
          const tone = row.status === 'done'
            ? 'text-muted-foreground'
            : row.status === 'active'
              ? 'font-medium text-foreground'
              : 'text-muted-foreground/70';
          const content = (
            <>
              <span className="relative grid size-4 shrink-0 place-items-center">
                <AnimatePresence initial={false}>
                  {row.status === 'done' ? (
                    <motion.span
                      key="done"
                      className="col-start-1 row-start-1 grid size-4 place-items-center rounded-[5px] bg-success/15 text-success-text"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, transition: STILL }}
                      transition={reduced ? STILL : POP}
                    >
                      {Tick}
                    </motion.span>
                  ) : row.status === 'active' ? (
                    <motion.span
                      key="active"
                      className="col-start-1 row-start-1 size-2 rounded-full bg-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: STILL }}
                      transition={STILL}
                    />
                  ) : (
                    <motion.span
                      key="pending"
                      className="col-start-1 row-start-1 size-[5px] rounded-[2px] bg-border"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: STILL }}
                      transition={STILL}
                    />
                  )}
                </AnimatePresence>
              </span>
              <span className={cn('min-w-0 flex-1 truncate text-left text-sm transition-colors duration-200', tone)}>
                {row.label}
                {row.status === 'done' && <span className="sr-only"> (complete)</span>}
              </span>
              {row.status === 'active' && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Next
                </span>
              )}
            </>
          );
          return (
            <li key={row.id} aria-current={row.status === 'active' ? 'step' : undefined}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </button>
              ) : (
                <span className="flex min-h-9 items-center gap-2.5 px-2 py-1">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      <output className="sr-only">{spoken}</output>
      <span className="sr-only" aria-live={complete ? 'polite' : 'off'}>
        {complete ? 'Launch checklist complete' : ''}
      </span>
    </div>
  );
}
