'use client';

/** Shared Curator Studio chrome: the view context, soft section cards, status chips, notices, and receipt rows. */

import { createContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StudioView =
  | 'studio-overview'
  | 'studio-profile'
  | 'studio-plan'
  | 'studio-earnings'
  | 'studio-billing';

/** Resolves a section anchor (e.g. "#studio-pro") or a view id to the dashboard view that hosts it. */
export function studioViewOf(sectionId: string): StudioView {
  switch (sectionId) {
    case 'studio-overview':
    case 'studio-profile':
    case 'studio-plan':
    case 'studio-earnings':
    case 'studio-billing':
      return sectionId;
    case 'studio-pro':
    case 'studio-payouts':
      return 'studio-billing';
    default:
      return 'studio-overview';
  }
}

/** Lets any section link switch the dashboard to the view that holds its target.
    Every view stays mounted (hidden when inactive) so queries and provider
    return flows keep running regardless of which view is showing. */
export const StudioStepsContext = createContext<{ open: (sectionId: string) => void } | null>(null);

export type StudioChipTone = 'neutral' | 'positive' | 'warning' | 'danger';

const chipTones = {
  neutral: 'text-muted-foreground',
  positive: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-destructive',
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium leading-none',
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

/** One studio section: a soft card with a sentence-case label, title, optional
    status chip, and description. Sections are always expanded; the dashboard
    decides which view (and therefore which sections) is visible. */
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
  return (
    <section
      id={id}
      data-testid={testId}
      aria-labelledby={headingId}
      // scroll-mt keeps anchored jumps clear of any sticky chrome above.
      className="scroll-mt-24 rounded-xl border border-border bg-card elev-soft"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{eyebrow}</p>
          <h2 id={headingId} className="mt-0.5 text-lg font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {chip}
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
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
        ? cn('block rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm', className)
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
