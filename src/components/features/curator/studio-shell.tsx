'use client';

/** Shared Curator Studio chrome: accordion steps, status chips, notices, and receipt rows. */

import { createContext, useContext, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Single-open accordion state shared by the studio page and its step sections.
    Collapsed steps stay mounted (only visually folded) so their queries keep running. */
export const StudioStepsContext = createContext<{
  openId: string | null;
  toggle: (id: string) => void;
  open: (id: string) => void;
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]',
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

  return (
    <section
      id={id}
      data-testid={testId}
      aria-labelledby={headingId}
      // scroll-mt keeps anchored jumps clear of any sticky chrome above
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-xl border bg-card transition-shadow',
        open ? 'border-border/80 elev-2' : 'border-border/60',
      )}
    >
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          data-testid={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => steps?.toggle(id)}
          className={cn(
            'group flex w-full items-center gap-4 px-5 py-5 text-left transition-colors sm:px-8 sm:py-6',
            !open && 'hover:bg-muted/40',
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </span>
            <span className="mt-1.5 block break-words font-teko text-3xl font-semibold uppercase leading-none tracking-tight">
              {title}
            </span>
          </span>
          {chip}
          <ChevronDown
            aria-hidden
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-300', open && 'rotate-180')}
          />
        </button>
      </h2>
      {/* 0fr -> 1fr grid rows animate the fold without measuring content height */}
      <div
        id={`${id}-body`}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-6 sm:px-8 sm:pb-7">
            {description && (
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
            <div className={cn('editorial-rule-dashed', description && 'mt-4')} />
            <div className="pt-6">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Inline confirmation banner; keeps the <output> semantics tests and screen readers rely on. */
export function StudioNotice({
  testId,
  children,
}: {
  testId?: string;
  children: ReactNode;
}) {
  return (
    <output
      data-testid={testId}
      aria-live="polite"
      className="block rounded-lg border border-primary/25 border-l-2 border-l-primary bg-primary/5 px-4 py-3 text-sm"
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

/** Small labeled stat tile used for status/fact grids inside sections. */
export function StudioFact({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3', className)}>
      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium">{children}</dd>
    </div>
  );
}
