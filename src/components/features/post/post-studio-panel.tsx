'use client';

/** Owner-only post studio: an Access tab to gate the post for members, and an Insights tab for its performance. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Info, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { useUpdatePost } from '@/hooks/use-music';
import { ApiError, apiService } from '@/services/api';
import type { CuratorPlan } from '@/services/curator-plans';
import { money } from '@/components/features/curator/curator-plan-preview';
import type { PostInsightsPlatformBreakdownItem, PostInsightsResponse, PostInsightsTrendPoint, PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';

type InsightsStatus = 'loading' | 'success' | 'error';

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
      <div className="mt-3 grid grid-cols-2 overflow-hidden card-quiet">
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
                  className="h-24 w-[6px] origin-bottom rounded-sm bg-foreground/80 transition-transform duration-300 ease-out"
                  style={{ transform: `scaleY(${viewH / 96})` }}
                  aria-hidden
                />
                <div
                  className="h-24 w-[6px] origin-bottom rounded-sm bg-primary transition-transform duration-300 ease-out"
                  style={{ transform: `scaleY(${openH / 96})` }}
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
        <div className="mt-3 card-quiet">
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
    <div className="card-quiet p-6 text-center">
      <p className="text-sm font-medium text-foreground">Unable to load insights</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────
 * Insights tab — fetches on mount, so the request only fires once the
 * owner actually opens this tab.
 * ───────────────────────────────────────────────────────────────────── */
function InsightsTab({ postId, conversionSuccessCount }: { postId: string; conversionSuccessCount?: number }) {
  const [status, setStatus] = useState<InsightsStatus>('loading');
  const [insights, setInsights] = useState<PostInsightsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!postId) return;

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
  }, [postId, reloadKey]);

  const conversions: OverviewItem[] = conversionSuccessCount !== undefined
    ? [{
        label: 'Conversions',
        value: formatMetric(Math.max(0, conversionSuccessCount)),
        description:
          'Successful cross-platform matches — times Cassette found this track on a viewer’s preferred service.',
      }]
    : [];

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
        ...conversions,
      ]
    : conversions;

  const showEmptyState = status === 'success' && !hasAudienceActivity(insights);
  const showPlatformBreakdown = (insights?.platformBreakdown.length ?? 0) > 0;
  const showTrend = (insights?.trend ?? []).some(
    (point) => point.views > 0 || point.destinationOpens > 0,
  );

  if (status === 'error') {
    return (
      <InsightsErrorState
        message={errorMessage || 'Unable to load insights.'}
        onRetry={() => setReloadKey((c) => c + 1)}
      />
    );
  }
  if (status !== 'success') return <InsightsLoadingState />;

  return (
    <>
      {overviewItems.length > 0 ? <Overview items={overviewItems} /> : null}
      {showEmptyState ? <InsightsEmptyState /> : null}
      {showPlatformBreakdown && insights ? (
        <PlatformBreakdown items={insights.platformBreakdown} />
      ) : null}
      {showTrend && insights ? <TrendChart points={insights.trend} /> : null}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Access tab — who can open this post, and what unlocks members-only.
 * ───────────────────────────────────────────────────────────────────── */
/** The visibilities an owner can pick here; a legacy value simply leaves no radio checked. */
type AccessPrivacy = Extract<PostPrivacy, 'public' | 'subscriber' | 'private'>;

const accessOptions: ReadonlyArray<{ value: AccessPrivacy; label: string; description: string }> = [
  { value: 'public', label: 'Public', description: 'Anyone can open it from your profile or the link.' },
  {
    value: 'subscriber',
    label: 'Members only',
    description: 'Locked on your curator page. Only fans with an active membership can open it.',
  },
  { value: 'private', label: 'Private', description: 'Hidden from your profile for everyone but you. Anyone with the link can still open it.' },
];

const formatPlanPrice = (plan: CuratorPlan): string => `${money(plan.amountMinor, plan.currency)}/mo`;

function AccessTab({
  postId,
  privacy,
  onPrivacyChange,
}: {
  postId: string;
  privacy: PostPrivacy;
  onPrivacyChange: (privacy: AccessPrivacy) => void;
}) {
  const access = useMemberPostAccess();
  const updatePost = useUpdatePost();
  const canLock = access.state === 'ready' || privacy === 'subscriber';

  const choose = (next: AccessPrivacy) => {
    if (next === privacy || updatePost.isPending) return;
    updatePost.mutate({ postId, privacy: next }, {
      onSuccess: () => {
        onPrivacyChange(next);
        toast.success(next === 'subscriber' ? 'Post locked for members.' : 'Post visibility updated.');
      },
      onError: () => toast.error('Failed to update post visibility. Please try again.'),
    });
  };

  return (
    <>
      <section>
        <SectionHeading>Who can open it</SectionHeading>
        <fieldset className="mt-3 overflow-hidden card-quiet" disabled={updatePost.isPending}>
          <legend className="sr-only">Post visibility</legend>
          {accessOptions.map((option) => {
            const disabled = option.value === 'subscriber' && !canLock;
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 border-t border-border p-4 first:border-t-0',
                  disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/40',
                )}
              >
                <input
                  type="radio"
                  name="post-access"
                  value={option.value}
                  checked={privacy === option.value}
                  disabled={disabled}
                  onChange={() => choose(option.value)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground">{option.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </section>

      <section>
        <SectionHeading>What unlocks members-only</SectionHeading>
        <div className="mt-3">
          {access.state === 'loading' ? (
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : access.state === 'error' ? (
            <div className="card-quiet p-4">
              <p className="text-[12px] leading-relaxed text-muted-foreground">Could not load your membership setup.</p>
              <Button type="button" variant="outline" size="sm" onClick={access.refetch} className="mt-3">
                Try again
              </Button>
            </div>
          ) : access.state === 'ready' ? (
            <ul className="divide-y divide-border overflow-hidden card-quiet">
              {access.plans.map((plan) => (
                <li key={plan.id} className="flex items-baseline justify-between gap-3 p-4 text-[13px]">
                  <span className="truncate font-medium text-foreground">{plan.name}</span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                    {formatPlanPrice(plan)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5">
              <p className="text-sm font-medium text-foreground">
                {access.state === 'needs-pro' ? 'Monetize your music' : 'Publish a member-posts plan'}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {access.state === 'needs-pro'
                  ? 'Curator Pro lets you lock posts like this one for paying members and earn membership revenue.'
                  : 'Members-only posts open for fans on a published plan that includes member posts.'}
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/studio/curator" prefetch={false}>
                  {access.state === 'needs-pro' ? 'Start Curator Pro' : 'Open Curator Studio'}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * PANEL — owner-only side panel: Access first, Insights one tap away.
 * ───────────────────────────────────────────────────────────────────── */
type StudioTab = 'access' | 'insights';

interface PostStudioPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  privacy: PostPrivacy;
  onPrivacyChange: (privacy: AccessPrivacy) => void;
  conversionSuccessCount?: number;
}

export function PostStudioPanel({
  open,
  onOpenChange,
  postId,
  privacy,
  onPrivacyChange,
  conversionSuccessCount,
}: PostStudioPanelProps) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<StudioTab>('access');
  // Insights mounts on first visit (gating its request) and then stays mounted
  // while the panel is open, so tab switches do not refetch either tab.
  const [insightsVisited, setInsightsVisited] = useState(false);

  // The page also closes the panel by prop, so reset from `open` rather than the close handler.
  useEffect(() => {
    if (!open) {
      setTab('access');
      setInsightsVisited(false);
    }
  }, [open]);

  const contentClasses = isMobile
    ? cn(
        'fixed inset-x-0 bottom-0 z-50 flex flex-col gap-0 h-[85vh] overflow-hidden rounded-t-xl border-t border-border bg-background elev-3',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        'data-[state=open]:duration-400 data-[state=closed]:duration-280',
        'data-[state=open]:ease-out-quart',
        'data-[state=closed]:ease-in-quart',
        'will-change-transform',
      )
    : cn(
        // Docked beside the page, below the fixed navbar (h-16, z-50): no shadow, so it
        // reads as the same layer as the content it pushes aside, not a sheet over it.
        'fixed top-16 right-0 bottom-0 z-40 flex w-full flex-col gap-0 overflow-hidden border-l border-border bg-background',
        'sm:max-w-md md:max-w-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:duration-450 data-[state=closed]:duration-300',
        'data-[state=open]:ease-out-quart',
        'data-[state=closed]:ease-in-quart',
        'will-change-transform',
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
              'data-[state=open]:duration-300 data-[state=closed]:duration-200',
            )}
          />
        )}
        <DialogPrimitive.Content
          className={contentClasses}
          data-testid="post-studio-panel"
          // Docked beside the post on desktop, often auto-opened: keep focus on the page.
          onOpenAutoFocus={(event) => {
            if (!isMobile) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (!isMobile) event.preventDefault();
          }}
          onFocusOutside={(event) => {
            if (!isMobile) event.preventDefault();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Post studio</DialogPrimitive.Title>

          {/* Header: one bar, tabs left and close right */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 sm:px-5">
            <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:inline">
              Your post
            </span>
            <SegmentedControl
              label="Post studio sections"
              className="w-full max-w-[220px]"
              value={tab}
              onValueChange={(next) => {
                if (next === 'insights') setInsightsVisited(true);
                setTab(next === 'insights' ? 'insights' : 'access');
              }}
              options={[
                { value: 'access', label: 'Access' },
                { value: 'insights', label: 'Insights' },
              ]}
            />
            <DialogPrimitive.Close
              className="ml-auto -mr-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Close post studio"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            <div className="space-y-7" hidden={tab !== 'access'}>
              <AccessTab postId={postId} privacy={privacy} onPrivacyChange={onPrivacyChange} />
            </div>
            {insightsVisited && (
              <div className="space-y-7" hidden={tab !== 'insights'}>
                <InsightsTab postId={postId} conversionSuccessCount={conversionSuccessCount} />
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
