'use client';

/** Owner-only tools for a post as one stacked column: the post's visibility as
    the headline, who can open it, which plans unlock members-only, and its
    insights. On wide screens the column sits in the page beside the post; below
    that the same content opens as a bottom sheet from the engagement bar. */

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { SlidersHorizontal, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ownerVisibilities,
  postVisibility,
  visibilityOf,
  type OwnerVisibility,
} from '@/components/features/post/post-visibility';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { useUpdatePost } from '@/hooks/use-music';
import { ApiError, apiService } from '@/services/api';
import type { CuratorPlan } from '@/services/curator-plans';
import { money } from '@/components/features/curator/curator-plan-preview';
import type { PostInsightsPlatformBreakdownItem, PostInsightsResponse, PostInsightsTrendPoint, PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';
import { ValueFlash } from '@/components/ui/interior/value-flash';

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

/* ─── Shared pieces ─────────────────────────────────────────────────── */
const eyebrowClass = 'font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-primary';

/** Sentence-case section title, as on the Studio cards; hairlines between sections do the separating. */
function SectionHeading({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold">{children}</h3>
      {meta ? <div className="text-xs tabular-nums text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

type MetricItem = { label: string; value: number; hint?: string };

/** One figure: small label, Teko number, one-line hint. Rendered as a dl group. */
function Metric({ label, value, hint, className }: MetricItem & { className?: string }) {
  return (
    <div className={cn('min-w-0 py-3', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-teko text-3xl font-bold leading-none tabular-nums">
        <ValueFlash value={value} format={formatMetric} label={label} />
      </dd>
      {hint && <dd className="mt-1 truncate text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** Two figures per row with a hairline between rows; an odd last figure takes the whole row. */
function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6">
      {items.map((item, i) => (
        <Metric
          key={item.label}
          {...item}
          className={cn(
            i >= 2 && 'border-t border-border/70',
            i === items.length - 1 && items.length % 2 === 1 && 'col-span-2',
          )}
        />
      ))}
    </dl>
  );
}

/* ─── Insights ──────────────────────────────────────────────────────── */
function PlatformBreakdown({ items }: { items: PostInsightsPlatformBreakdownItem[] }) {
  const sorted = [...items].sort((a, b) => b.shareOfOpens - a.shareOfOpens);
  const totalOpens = sorted.reduce((sum, i) => sum + i.opens, 0);

  return (
    <section>
      <SectionHeading meta={`${formatFull(totalOpens)} opens`}>Platforms</SectionHeading>
      <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {sorted.map((item) => (
          <div
            key={`bar-${item.platform}`}
            className={cn('h-full', platformBarClass(item.platform))}
            style={{ width: `${Math.max(0, item.shareOfOpens * 100)}%` }}
            title={`${formatPlatformLabel(item.platform)}: ${formatPercent(item.shareOfOpens)}`}
            aria-hidden
          />
        ))}
      </div>
      <ul className="mt-2 divide-y divide-border/70">
        {sorted.map((item) => (
          <li key={`row-${item.platform}`} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn('size-2 shrink-0 rounded-full', platformBarClass(item.platform))} aria-hidden />
              <span className="truncate">{formatPlatformLabel(item.platform)}</span>
            </span>
            <span className="flex items-baseline gap-3 font-mono text-xs tabular-nums text-muted-foreground">
              <span>{formatMetric(item.opens)}</span>
              <span className="w-12 text-right text-foreground">{formatPercent(item.shareOfOpens)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrendChart({ points }: { points: PostInsightsTrendPoint[] }) {
  const maxValue = Math.max(1, ...points.flatMap((p) => [p.views, p.destinationOpens]));
  const totalViews = points.reduce((s, p) => s + p.views, 0);
  const totalOpens = points.reduce((s, p) => s + p.destinationOpens, 0);

  return (
    <section>
      <SectionHeading
        meta={
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-foreground" aria-hidden />
              {formatMetric(totalViews)} views
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" aria-hidden />
              {formatMetric(totalOpens)} opens
            </span>
          </span>
        }
      >
        Last 7 days
      </SectionHeading>
      <div className="mt-4 grid h-20 grid-cols-7 items-end gap-1.5">
        {points.map((point) => (
          <div
            key={point.date}
            className="flex h-full items-end justify-center gap-1"
            title={`${formatShortDate(point.date)} · ${point.views} views · ${point.destinationOpens} opens`}
          >
            <div
              className="h-20 w-1.5 origin-bottom rounded-sm bg-foreground/80"
              style={{ transform: `scaleY(${point.views > 0 ? Math.max(0.04, point.views / maxValue) : 0})` }}
              aria-hidden
            />
            <div
              className="h-20 w-1.5 origin-bottom rounded-sm bg-primary"
              style={{ transform: `scaleY(${point.destinationOpens > 0 ? Math.max(0.04, point.destinationOpens / maxValue) : 0})` }}
              aria-hidden
            />
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 border-t border-border/70 pt-2">
        {points.map((point) => (
          <div key={`axis-${point.date}`} className="text-center text-[11px] leading-none text-muted-foreground">
            {formatWeekday(point.date)}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Fetches once on mount; the column and the sheet both mount it only when an owner can see it. */
function InsightsSections({ postId, conversionSuccessCount }: { postId: string; conversionSuccessCount?: number }) {
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

  const conversions: MetricItem[] = conversionSuccessCount !== undefined
    ? [{ label: 'Conversions', value: Math.max(0, conversionSuccessCount), hint: 'Matched on a listener’s service' }]
    : [];

  const metrics: MetricItem[] = insights
    ? [
        { label: 'Views', value: insights.lifetime.views, hint: 'Includes repeat visits' },
        { label: 'Unique viewers', value: insights.lifetime.uniqueViewers, hint: 'Distinct people' },
        {
          label: 'Destination opens',
          value: insights.lifetime.destinationOpens,
          hint: insights.lifetime.views > 0 ? `${formatPercent(insights.lifetime.openRate)} open rate` : 'Listen clicks',
        },
        { label: 'Shares', value: insights.lifetime.shares, hint: 'Share button and copied links' },
        ...conversions,
      ]
    : conversions;

  const showPlatformBreakdown = (insights?.platformBreakdown.length ?? 0) > 0;
  const showTrend = (insights?.trend ?? []).some((point) => point.views > 0 || point.destinationOpens > 0);

  return (
    <>
      <section>
        <SectionHeading>Insights</SectionHeading>
        {status === 'loading' ? (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-7 w-14" />
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <div className="mt-2 space-y-3">
            <p role="alert" className="text-sm text-muted-foreground">{errorMessage || 'Unable to load insights.'}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((c) => c + 1)}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            {metrics.length > 0 && <div className="mt-1"><MetricGrid items={metrics} /></div>}
            {!hasAudienceActivity(insights) && (
              <p className="mt-2 text-sm text-muted-foreground">
                No activity yet. Views and opens appear here once people open this post.
              </p>
            )}
          </>
        )}
      </section>
      {showPlatformBreakdown && insights && <PlatformBreakdown items={insights.platformBreakdown} />}
      {showTrend && insights && <TrendChart points={insights.trend} />}
    </>
  );
}

/* ─── Access ────────────────────────────────────────────────────────── */
const formatPlanPrice = (plan: CuratorPlan): string => `${money(plan.amountMinor, plan.currency)}/mo`;

function AccessSections({
  postId,
  privacy,
  onPrivacyChange,
}: {
  postId: string;
  privacy: PostPrivacy;
  onPrivacyChange: (privacy: OwnerVisibility) => void;
}) {
  const access = useMemberPostAccess();
  const updatePost = useUpdatePost();
  const canLock = access.state === 'ready' || privacy === 'subscriber';
  // Native radios group by name across the document, so each mounted copy needs its own.
  const groupName = useId();

  const choose = (next: OwnerVisibility) => {
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
        <fieldset className="mt-1 divide-y divide-border/70" disabled={updatePost.isPending}>
          <legend className="sr-only">Post visibility</legend>
          {ownerVisibilities.map((value) => {
            const { label, icon: Icon, rule } = postVisibility[value];
            const disabled = value === 'subscriber' && !canLock;
            return (
              <label
                key={value}
                className={cn('flex items-center gap-3 py-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={value}
                  checked={privacy === value}
                  disabled={disabled}
                  onChange={() => choose(value)}
                  className="size-4 shrink-0 accent-primary"
                />
                <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{rule}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </section>

      <section>
        <SectionHeading>What unlocks members-only</SectionHeading>
        {access.state === 'loading' ? (
          <div className="mt-3 space-y-2.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : access.state === 'error' ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground">Could not load your membership setup.</p>
            <Button type="button" variant="outline" size="sm" onClick={access.refetch}>
              Try again
            </Button>
          </div>
        ) : access.state === 'ready' ? (
          <ul className="mt-1 divide-y divide-border/70">
            {access.plans.map((plan) => (
              <li key={plan.id} className="flex items-baseline justify-between gap-3 py-3">
                <span className="truncate text-sm font-medium">{plan.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatPlanPrice(plan)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Fans need a published plan that includes member posts.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/studio/curator" prefetch={false}>
                Open Curator Studio
              </Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

/* ─── Column and sheet ──────────────────────────────────────────────── */
interface PostStudioContentProps {
  postId: string;
  privacy: PostPrivacy;
  onPrivacyChange: (privacy: OwnerVisibility) => void;
  conversionSuccessCount?: number;
}

function PostStudioContent({
  postId,
  privacy,
  onPrivacyChange,
  conversionSuccessCount,
  eyebrow = <p className={eyebrowClass}>Your post</p>,
  action,
}: PostStudioContentProps & { eyebrow?: ReactNode; action?: ReactNode }) {
  const visibility = visibilityOf(privacy);
  const StatusIcon = visibility?.icon ?? SlidersHorizontal;

  return (
    <>
      <header>
        <div className="flex items-center justify-between gap-3">
          {eyebrow}
          {action}
        </div>
        {/* Keyed on the setting so a change crossfades instead of swapping text in place. */}
        <div key={privacy} className="mt-4 flex items-start gap-3.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-280">
          <span
            aria-hidden
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-lg',
              privacy === 'subscriber' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <StatusIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-teko text-3xl font-bold uppercase leading-none tracking-tight">
              {visibility?.label ?? 'Visibility'}
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
              {visibility?.summary ?? 'This post uses an older setting. Choose who can open it below.'}
            </p>
          </div>
        </div>
      </header>
      {/* Sections stack with a hairline between them; nothing inside is boxed. */}
      <div className="mt-6 divide-y divide-border/70 [&>section+section]:pt-5 [&>section]:pb-3 [&>section:last-child]:pb-0">
        <AccessSections postId={postId} privacy={privacy} onPrivacyChange={onPrivacyChange} />
        <InsightsSections postId={postId} conversionSuccessCount={conversionSuccessCount} />
      </div>
    </>
  );
}

/** The owner column beside the post on wide screens. */
export function PostStudioColumn({ className, ...props }: PostStudioContentProps & { className?: string }) {
  return (
    <aside
      aria-label="Your post"
      data-testid="post-studio-panel"
      className={cn('card-quiet w-80 shrink-0 p-6', className)}
    >
      <PostStudioContent {...props} />
    </aside>
  );
}

/** The same tools as a bottom sheet for screens without room for the column. */
export function PostStudioSheet({
  open,
  onOpenChange,
  ...props
}: PostStudioContentProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/40',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-300 data-[state=closed]:duration-200',
          )}
        />
        <DialogPrimitive.Content
          data-testid="post-studio-sheet"
          // The headline under the eyebrow describes the sheet; Radix's own description slot stays empty.
          aria-describedby={undefined}
          // Radix would return focus to a Trigger this sheet does not render. The engagement
          // bar pill is the sheet's real opener (the menus only mirror it), so focus goes there.
          onCloseAutoFocus={(event) => {
            const pill = document.querySelector<HTMLElement>('[data-studio-trigger]');
            if (!pill) return;
            event.preventDefault();
            pill.focus();
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-border bg-background p-6 elev-3',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-400 data-[state=closed]:duration-280',
            'data-[state=open]:ease-out-quart data-[state=closed]:ease-in-quart',
          )}
        >
          <PostStudioContent
            {...props}
            eyebrow={<DialogPrimitive.Title className={eyebrowClass}>Your post</DialogPrimitive.Title>}
            action={
              <DialogPrimitive.Close
                className="-mr-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Close post studio"
              >
                <XIcon className="size-4" />
              </DialogPrimitive.Close>
            }
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
