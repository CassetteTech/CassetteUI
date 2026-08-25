'use client';

/** Shared Curator Studio chrome: accordion steps, status chips, notices, and receipt rows. */

import { createContext, useContext, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Single-open accordion state shared by the studio page and its step sections.
    Collapsed steps stay mounted (only visually folded) so their queries keep running.
    `eyebrows` lets the page override a section's eyebrow by id (e.g. numbered
    "Step n" labels while that section sits in the setup stepper). */
export const StudioStepsContext = createContext<{
  openId: string | null;
  toggle: (id: string) => void;
  open: (id: string) => void;
  eyebrows?: Record<string, ReactNode>;
} | null>(null);

export type StudioChipTone = 'neutral' | 'positive' | 'warning' | 'danger';

const chipTones = {
  neutral: 'border-border text-muted-foreground',
  positive: 'border-success-text/40 text-success-text',
  warning: 'border-warning-text/40 text-warning-text',
  danger: 'border-destructive/40 text-destructive',
} satisfies Record<StudioChipTone, string>;

export function StudioChip({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.ComponentProps<'span'> & { tone?: StudioChipTone }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-none border bg-transparent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]',
        chipTones[tone],
        className,
      )}
      {...props}
    >
      {/* signal-dot renders in currentColor, so it follows the tone automatically */}
      <span className="signal-dot" aria-hidden />
      {children}
    </span>
  );
}

/** One studio step. Renders as an accordion item when a StudioStepsContext is
    present: the header row is always visible (eyebrow, title, status chip); the
    body folds shut but stays in the DOM so queries and form state survive. */
export function StudioSection({
  id,
  eyebrow,
  title,
  headingId,
  description,
  chip,
  testId,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: string;
  headingId: string;
  description?: ReactNode;
  chip?: ReactNode;
  testId?: string;
  children: ReactNode;
}) {
  const steps = useContext(StudioStepsContext);
  // Without a provider (storybook-style usage) the section is simply open.
  const open = steps ? steps.openId === id : true;
  // The page can override the eyebrow by id (e.g. numbered setup steps).
  const eyebrowNode = steps?.eyebrows?.[id] ?? eyebrow;

  return (
    <section
      id={id}
      data-testid={testId}
      aria-labelledby={headingId}
      // scroll-mt keeps anchored jumps clear of any sticky chrome above.
      // Flat language: full-width block, strong top rule, no card chrome.
      className="scroll-mt-24 rounded-none border-t-2 border-foreground/15 bg-transparent"
    >
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          data-testid={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => steps?.toggle(id)}
          className={cn(
            'group flex w-full items-center gap-4 py-6 text-left transition-colors sm:py-7',
            !open && 'hover:bg-muted/30',
          )}
        >
          {/* Chip stacks under the title on narrow screens so they never fight for one row */}
          <span className="flex min-w-0 flex-1 flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <span className="min-w-0 flex-1">
              {/* short red rule echoes the hero's brand-red top bar */}
              <span aria-hidden className="mb-2.5 block h-0.5 w-8 bg-primary" />
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {eyebrowNode}
              </span>
              <span className="mt-1.5 block text-balance break-words font-teko text-2xl font-semibold uppercase leading-none tracking-tight sm:text-3xl">
                {title}
              </span>
            </span>
            {chip}
          </span>
          <ChevronDown
            aria-hidden
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none', open && 'rotate-180')}
          />
        </button>
      </h2>
      {/* 0fr -> 1fr grid rows animate the fold without measuring content height */}
      <div
        id={`${id}-body`}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-8 sm:pb-10">
            {description && (
              <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
            <div className={cn('editorial-rule-dashed', description && 'mt-4')} />
            <div className="pt-6">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Inline confirmation banner; keeps the <output> semantics tests and screen readers rely on.
    The live region stays mounted (visually collapsed while empty) so swapping the text
    content in actually fires the announcement. */
export function StudioNotice({
  testId,
  className,
  children,
}: {
  testId?: string;
  /** Applied only while the notice has visible content. */
  className?: string;
  children: ReactNode;
}) {
  const hasContent = children !== null && children !== undefined && children !== false && children !== '';
  return (
    <output
      data-testid={testId}
      aria-live="polite"
      className={hasContent
        ? cn('block rounded-none border border-primary/25 border-l-2 border-l-primary bg-primary/5 px-4 py-3 text-sm', className)
        : 'sr-only'}
    >
      {children}
    </output>
  );
}

/** One receipt line: label on the left, mono amount on the right.
    The wrapping div is load-bearing — tests locate amounts via their parent row. */
export function ReceiptRow({
  label,
  value,
  emphasized,
  deduction,
  className,
}: {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
  deduction?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <dt className={cn('text-muted-foreground', emphasized && 'font-semibold text-foreground')}>{label}</dt>
      <dd
        className={cn(
          'font-mono text-sm tabular-nums',
          emphasized && 'font-semibold',
          deduction && 'text-muted-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
