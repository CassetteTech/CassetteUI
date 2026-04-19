'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Info, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { ApiError, apiService } from '@/services/api';
import type { PostInsightsPlatformBreakdownItem, PostInsightsResponse, PostInsightsTrendPoint } from '@/types';
import { cn } from '@/lib/utils';

interface PostInsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  conversionSuccessCount?: number;
}

type InsightsStatus = 'idle' | 'loading' | 'success' | 'error';

/* ─── Number formatters ─────────────────────────────────────────────── */
const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

const fullNumberFormatter = new Intl.NumberFormat('en-US');

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  style: 'percent',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function formatMetric(value: number): string {
  if (value < 1000) return fullNumberFormatter.format(value);
  return compactNumberFormatter.format(value);
}

function formatFull(value: number): string {
  return fullNumberFormatter.format(value);
}

function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

function parseTrendDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatWeekday(value: string): string {
  const parsed = parseTrendDate(value);
  return Number.isNaN(parsed.getTime()) ? value : weekdayFormatter.format(parsed);
}

function formatShortDate(value: string): string {
  const parsed = parseTrendDate(value);
  return Number.isNaN(parsed.getTime()) ? value : shortDateFormatter.format(parsed);
}

function formatPlatformLabel(platform: string): string {
  if (platform === 'apple') return 'Apple Music';
  if (platform === 'spotify') return 'Spotify';
  if (platform === 'deezer') return 'Deezer';
  if (platform === 'unknown') return 'Other';
  return platform;
}

function platformBarClass(platform: string): string {
  if (platform === 'spotify') return 'bg-platform-spotify';
  if (platform === 'apple') return 'bg-platform-apple-music';
  if (platform === 'deezer') return 'bg-platform-deezer';
  return 'bg-muted-foreground/60';
}

function hasAudienceActivity(insights: PostInsightsResponse | null): boolean {
  if (!insights) return false;
  return [
    insights.lifetime.views,
    insights.lifetime.uniqueViewers,
    insights.lifetime.destinationOpens,
    insights.lifetime.shares,
  ].some((v) => v > 0);
}

/* ─────────────────────────────────────────────────────────────────────
 * InfoTip — tap/click-to-toggle info popover. Works identically on
 * touch and mouse. Escape + outside-click dismiss.
 * ───────────────────────────────────────────────────────────────────── */
function InfoTip({
  label,
  description,
  align = 'start',
  side = 'bottom',
}: {
  label: string;
  description: string;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    if (!mounted) return;
    const timeout = window.setTimeout(() => setMounted(false), 150);
    return () => window.clearTimeout(timeout);
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [mounted]);

  useLayoutEffect(() => {
    if (!mounted) return;

    const updatePosition = () => {
      const trigger = buttonRef.current;
      const popup = popupRef.current;
      if (!trigger || !popup) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const gap = 6;
      const padding = 8;
      const maxLeft = window.innerWidth - popupRect.width - padding;
      const left =
        align === 'end'
          ? Math.min(Math.max(triggerRect.right - popupRect.width, padding), maxLeft)
          : Math.min(Math.max(triggerRect.left, padding), maxLeft);
      const top =
        side === 'top'
          ? Math.max(triggerRect.top - popupRect.height - gap, padding)
          : Math.min(
              triggerRect.bottom + gap,
              window.innerHeight - popupRect.height - padding,
            );

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [align, mounted, side]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          open && 'bg-muted text-foreground',
        )}
      >
        <Info className="size-3" aria-hidden />
      </button>
      {mounted
        ? createPortal(
            <div
              ref={popupRef}
              role="tooltip"
              className={cn(
                'fixed z-[70] w-52 rounded-md border border-border bg-popover p-3 text-popover-foreground elev-2',
                'transition-opacity duration-150',
                open ? 'opacity-100' : 'opacity-0',
              )}
              style={{ top: position.top, left: position.left }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground">
                {label}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Section heading — small, plain, consistent
 * ───────────────────────────────────────────────────────────────────── */
function SectionHeading({ children, meta }: { children: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </h3>
      {meta ? <div className="text-[11px] text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Stat cell — label + number, optional info popover
 * ───────────────────────────────────────────────────────────────────── */
function Stat({
  label,
  value,
  meta,
  description,
  infoAlign = 'start',
  infoSide = 'bottom',
}: {
  label: string;
  value: string;
  meta?: string;
  description?: string;
  infoAlign?: 'start' | 'end';
  infoSide?: 'top' | 'bottom';
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </div>
        {description ? (
          <InfoTip label={label} description={description} align={infoAlign} side={infoSide} />
        ) : null}
      </div>
      <div className="mt-1 text-[26px] font-semibold leading-none tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      {meta ? (
        <div className="mt-1 text-[11px] tabular-nums text-muted-foreground">{meta}</div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Overview — 2-col grid of stats with explicit hairline dividers.
 *   • First row: no top border (card border handles it)
 *   • First column: no left border (card border handles it)
 *   • Orphan (odd-count) final cell: spans both columns
 * ───────────────────────────────────────────────────────────────────── */
type OverviewItem = { label: string; value: string; meta?: string; description?: string };

function Overview({ items }: { items: OverviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeading>Overview</SectionHeading>
      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isOrphan = isLast && items.length % 2 === 1;
          const isLeftCol = isOrphan ? true : i % 2 === 0;
          const isFirstRow = i < 2;
          const isBottomRow = isOrphan || i >= items.length - 2;

          return (
            <div
              key={item.label}
              className={cn(
                'p-4',
                isOrphan && 'col-span-2',
                !isLeftCol && 'border-l border-border',
                !isFirstRow && 'border-t border-border',
              )}
            >
              <Stat
                label={item.label}
                value={item.value}
                meta={item.meta}
                description={item.description}
                infoAlign={isLeftCol ? 'start' : 'end'}
                infoSide={isBottomRow ? 'top' : 'bottom'}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Platforms — single stacked bar + compact list
 * ───────────────────────────────────────────────────────────────────── */
function PlatformBreakdown({ items }: { items: PostInsightsPlatformBreakdownItem[] }) {
  const sorted = [...items].sort((a, b) => b.shareOfOpens - a.shareOfOpens);
  const hasAny = sorted.some((i) => i.shareOfOpens > 0);
  const totalOpens = sorted.reduce((sum, i) => sum + i.opens, 0);

  return (
    <section>
      <SectionHeading meta={`${formatFull(totalOpens)} opens`}>Platforms</SectionHeading>

      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {hasAny
          ? sorted.map((item) => (
              <div
                key={`bar-${item.platform}`}
                className={cn(
                  'h-full transition-[width] duration-500 ease-out',
                  platformBarClass(item.platform),
                )}
                style={{ width: `${Math.max(0, item.shareOfOpens * 100)}%` }}
                title={`${formatPlatformLabel(item.platform)}: ${formatPercent(item.shareOfOpens)}`}
                aria-hidden
              />
            ))
          : null}
      </div>

      <ul className="mt-4 space-y-2.5">
        {sorted.map((item) => (
          <li
            key={`row-${item.platform}`}
            className="flex items-center justify-between gap-3 text-[13px]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn('size-2 shrink-0 rounded-full', platformBarClass(item.platform))}
                aria-hidden
              />
              <span className="truncate font-medium text-foreground">
                {formatPlatformLabel(item.platform)}
              </span>
            </div>
            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="text-muted-foreground">{formatMetric(item.opens)}</span>
              <span className="w-12 text-right font-semibold text-foreground">
                {formatPercent(item.shareOfOpens)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Trend — minimal dual bars, shared baseline
 * ───────────────────────────────────────────────────────────────────── */
function TrendChart({ points }: { points: PostInsightsTrendPoint[] }) {
  const maxValue = Math.max(1, ...points.flatMap((p) => [p.views, p.destinationOpens]));
  const totalViews = points.reduce((s, p) => s + p.views, 0);
  const totalOpens = points.reduce((s, p) => s + p.destinationOpens, 0);

  return (
    <section>
      <SectionHeading
        meta={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-foreground" aria-hidden />
              <span className="tabular-nums">{formatMetric(totalViews)}</span>
              <span>views</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              <span className="tabular-nums">{formatMetric(totalOpens)}</span>
              <span>opens</span>
            </span>
          </div>
        }
      >
        Last 7 days
      </SectionHeading>

      <div className="mt-4">
        <div className="grid h-[96px] grid-cols-7 items-end gap-1.5">
          {points.map((point) => {
            const viewH = point.views > 0 ? Math.max(3, (point.views / maxValue) * 96) : 0;
            const openH = point.destinationOpens > 0 ? Math.max(3, (point.destinationOpens / maxValue) * 96) : 0;

            return (
              <div
                key={point.date}
                className="flex h-full w-full items-end justify-center gap-1"
                title={`${formatShortDate(point.date)} · ${point.views} views · ${point.destinationOpens} opens`}
              >
                <div
                  className="w-[6px] rounded-sm bg-foreground/80 transition-[height] duration-500 ease-out"
                  style={{ height: `${viewH}px` }}
                  aria-hidden
                />
                <div
                  className="w-[6px] rounded-sm bg-primary transition-[height] duration-500 ease-out"
                  style={{ height: `${openH}px` }}
                  aria-hidden
                />
              </div>
            );
          })}
        </div>

        <div className="mt-2 h-px w-full bg-border" aria-hidden />

        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {points.map((point) => (
            <div
              key={`axis-${point.date}`}
              className="text-center text-[11px] leading-none text-muted-foreground"
            >
              {formatWeekday(point.date)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Loading · Empty · Error
 * ───────────────────────────────────────────────────────────────────── */
function InsightsLoadingState() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-3 w-20" />
        <div className="mt-3 rounded-lg border border-border bg-card">
          <div className="grid grid-cols-2 divide-x divide-y divide-border [&>*:nth-child(-n+2)]:border-t-0 [&>*:nth-child(2n+1)]:border-l-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-7 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 grid h-[96px] grid-cols-7 items-end gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-full w-full rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightsEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
      <p className="text-sm font-medium text-foreground">No activity yet</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
        Views and opens will appear here once people start interacting with this post.
      </p>
    </div>
  );
}

function InsightsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-center">
      <p className="text-sm font-medium text-foreground">Unable to load insights</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * MAIN SHEET
 * ───────────────────────────────────────────────────────────────────── */
export function PostInsightsSheet({
  open,
  onOpenChange,
  postId,
  conversionSuccessCount,
}: PostInsightsSheetProps) {
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<InsightsStatus>('idle');
  const [insights, setInsights] = useState<PostInsightsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const contentClasses = isMobile
    ? cn(
        'fixed inset-x-0 bottom-0 z-50 flex flex-col gap-0 h-[85vh] overflow-hidden rounded-t-xl border-t border-border bg-background elev-3',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        'data-[state=open]:duration-[400ms] data-[state=closed]:duration-[280ms]',
        'data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-[state=closed]:ease-[cubic-bezier(0.64,0,0.78,0)]',
        'will-change-transform',
      )
    : cn(
        'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 overflow-hidden border-l border-border bg-background elev-3',
        'sm:max-w-md md:max-w-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:duration-[450ms] data-[state=closed]:duration-[300ms]',
        'data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-[state=closed]:ease-[cubic-bezier(0.64,0,0.78,0)]',
        'will-change-transform',
      );

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setErrorMessage(null);
      setInsights(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !postId) return;

    const controller = new AbortController();
    let cancelled = false;

    setStatus('loading');
    setErrorMessage(null);
    setInsights(null);

    void apiService
      .getPostInsights(postId, { signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        setInsights(response);
        setStatus('success');
      })
      .catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        const message = error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to load insights.';
        setErrorMessage(message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, postId, reloadKey]);

  /* ─── Derived stat grid ───────────────────────────────────────────── */
  const hasConversionCount = typeof conversionSuccessCount === 'number';

  const overviewItems: OverviewItem[] = insights
    ? [
        {
          label: 'Views',
          value: formatMetric(insights.lifetime.views),
          description:
            'Total times this post has been viewed, including repeat visits from the same person.',
        },
        {
          label: 'Unique Viewers',
          value: formatMetric(insights.lifetime.uniqueViewers),
          description:
            'Distinct people who viewed this post. Multiple views from the same person only count once.',
        },
        {
          label: 'Destination Opens',
          value: formatMetric(insights.lifetime.destinationOpens),
          meta: insights.lifetime.views > 0 ? `${formatPercent(insights.lifetime.openRate)} open rate` : undefined,
          description:
            'Times a viewer clicked through to listen on their preferred music platform (Spotify, Apple Music, or Deezer).',
        },
        {
          label: 'Shares',
          value: formatMetric(insights.lifetime.shares),
          description:
            'Times this post was shared — via the share button, a copied link, or forwarded to another app.',
        },
        ...(hasConversionCount
          ? [{
              label: 'Conversions',
              value: formatMetric(Math.max(0, conversionSuccessCount as number)),
              description:
                'Successful cross-platform matches — times Cassette found this track on a viewer’s preferred service.',
            }]
          : []),
      ]
    : hasConversionCount
      ? [{
          label: 'Conversions',
          value: formatMetric(Math.max(0, conversionSuccessCount as number)),
          description:
            'Successful cross-platform matches — times Cassette found this track on a viewer’s preferred service.',
        }]
      : [];

  const showEmptyState = status === 'success' && !hasAudienceActivity(insights);
  const showPlatformBreakdown = (insights?.platformBreakdown.length ?? 0) > 0;
  const showTrend = (insights?.trend ?? []).some(
    (point) => point.views > 0 || point.destinationOpens > 0,
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={isMobile}>
      <DialogPrimitive.Portal>
        {isMobile && (
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-foreground/40',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:duration-[300ms] data-[state=closed]:duration-[200ms]',
            )}
          />
        )}
        <DialogPrimitive.Content
          className={contentClasses}
          onInteractOutside={(event) => {
            if (!isMobile) event.preventDefault();
          }}
          onFocusOutside={(event) => {
            if (!isMobile) event.preventDefault();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Insights</DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-tight text-foreground">Insights</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">Post performance</div>
            </div>
            <DialogPrimitive.Close
              className="-mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close insights"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6">
            {status === 'loading' ? <InsightsLoadingState /> : null}

            {status === 'error' ? (
              <InsightsErrorState
                message={errorMessage || 'Unable to load insights.'}
                onRetry={() => setReloadKey((c) => c + 1)}
              />
            ) : null}

            {status === 'success' ? (
              <>
                {overviewItems.length > 0 ? <Overview items={overviewItems} /> : null}
                {showEmptyState ? <InsightsEmptyState /> : null}
                {showPlatformBreakdown && insights ? (
                  <PlatformBreakdown items={insights.platformBreakdown} />
                ) : null}
                {showTrend && insights ? <TrendChart points={insights.trend} /> : null}
              </>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
