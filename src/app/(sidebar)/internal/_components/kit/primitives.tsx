'use client';

import type { ReactNode } from 'react';
import { Copy, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '../internal-utils';

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
    <section className={cn('overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
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
    <div className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="signal-dot text-domain" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {section}
          </span>
        </div>
        <h1 className="mt-0.5 flex items-baseline gap-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
          {title}
          {count != null && (
            <span className="font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
              {count.toLocaleString()}
            </span>
          )}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-1.5 pb-0.5">{actions}</div>}
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

export function Mono({ children }: { children: ReactNode }) {
  return <span className="break-all font-mono text-[11px]">{children}</span>;
}

/* ─────────────────────────── ErrorBanner ───────────────────────────────
   Inline load-failure strip for panel bodies, with a retry affordance. */

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <span>{message}</span>
      <button type="button" className="underline underline-offset-2" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/* ─────────────────────────── RefreshButton ─────────────────────────────
   Quiet icon-only refresh for panel headers. */

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      disabled={loading}
      onClick={onClick}
      title="Refresh"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  );
}

/* ──────────────────────────── CopyId / IdField ─────────────────────────
   Copyable identifier chip — the canonical way IDs surface in detail sheets.
   IDs are long and noisy in a table row, so they live here where there's room
   to show them in full and one click puts them on the clipboard. */

export function CopyId({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => void copyToClipboard(value, label)}
      title={`Copy ${label}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] tabular-nums text-muted-foreground transition hover:border-domain/50 hover:text-foreground"
    >
      <span className="truncate">{value}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-50 transition group-hover:opacity-100" />
    </button>
  );
}

/* Stacked label + copyable id, for long ids that won't sit on a Field's right edge. */
export function IdField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <CopyId value={value} label={label} />
    </div>
  );
}
