'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────────────────────────── Tones ─────────────────────────────────── */

export type Tone = 'critical' | 'warning' | 'success' | 'info' | 'neutral' | 'domain';

const TONE_TEXT: Record<Tone, string> = {
  critical: 'text-destructive',
  warning: 'text-[hsl(var(--warning-text))]',
  success: 'text-[hsl(var(--success-text))]',
  info: 'text-[hsl(var(--info-text))]',
  neutral: 'text-muted-foreground',
  domain: 'text-domain',
};

const TONE_DOT: Record<Tone, string> = {
  critical: 'text-destructive',
  warning: 'text-[hsl(var(--warning))]',
  success: 'text-[hsl(var(--success))]',
  info: 'text-[hsl(var(--info))]',
  neutral: 'text-muted-foreground/50',
  domain: 'text-domain',
};

/* ─────────────────────────── StatusPill ───────────────────────────────
   Flat, dense status marker. A small signal dot + label, no pill chrome by
   default — reads as a terminal readout rather than a badge. */

export function StatusPill({
  tone,
  label,
  dot = true,
  className,
}: {
  tone: Tone;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', TONE_TEXT[tone], className)}>
      {dot && <span className={cn('signal-dot', TONE_DOT[tone])} aria-hidden />}
      {label}
    </span>
  );
}

/* ─────────────────────────────── Panel ─────────────────────────────────
   Flat bordered region. Optional thin header bar with a mono label + actions.
   Body has no padding by default so tables can sit edge-to-edge. */

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          {typeof title === 'string' ? (
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </h2>
          ) : (
            title
          )}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ──────────────────────────── SectionHeader ────────────────────────────
   Compact page header. A domain breadcrumb (dot + section / title) and an
   actions slot. No display type, no descriptions — terse by design. */

export function SectionHeader({
  section,
  title,
  count,
  actions,
  className,
}: {
  section: string;
  title: string;
  count?: number;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="signal-dot text-domain" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{section}</span>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {count != null && (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {count.toLocaleString()}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/* ─────────────────────────────── Stats ─────────────────────────────────
   Dense inline stat readouts, divided by hairlines — not cards. */

export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap divide-x divide-border rounded-lg border border-border bg-card',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  const valueColor = tone === 'neutral' ? 'text-foreground' : TONE_TEXT[tone];
  return (
    <div className="min-w-[7rem] flex-1 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-semibold tabular-nums leading-none', valueColor)}>{display}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────── Fields ────────────────────────────────
   Key/value rows for detail panels. Mono key, foreground value. */

export function Field({
  label,
  children,
  icon: Icon,
  className,
}: {
  label: string;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5', className)}>
      <span className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="min-w-0 text-right text-xs text-foreground">{children}</span>
    </div>
  );
}
