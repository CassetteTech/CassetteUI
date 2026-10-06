'use client';

/** Owner-only tools for a post as one stacked column: the post's visibility as
    the headline, who can open it, which plans unlock members-only, and its
    insights. On wide screens the column sits in the page beside the post; below
    that the same content opens as a bottom sheet from the engagement bar. */

import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useReducedMotion } from 'framer-motion';
import { LockKeyhole, SlidersHorizontal, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Area } from '@/components/dither-kit/area';
import { AreaChart } from '@/components/dither-kit/area-chart';
import { BlockLegend } from '@/components/dither-kit/block-legend';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { ReceiptRow } from '@/components/features/curator/studio-shell';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { AnnotatedText } from '@/components/ui/annotated-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ownerVisibilities,
  postVisibility,
  visibilityOf,
  type OwnerVisibility,
} from '@/components/features/post/post-visibility';
import { useAuthState } from '@/hooks/use-auth';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { useUpdatePost } from '@/hooks/use-music';
import { ApiError, apiService } from '@/services/api';
import type { CuratorPlan } from '@/services/curator-plans';
import { money, tornEdge } from '@/components/features/curator/curator-plan-preview';
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

const trendConfig: ChartConfig = {
  views: { label: 'Views', color: 'grey' },
  destinationOpens: { label: 'Opens', color: 'brand' },
};

/** Seven days as a dithered area chart: views hatched, opens dotted, totals in the legend. */
function TrendChart({ points }: { points: PostInsightsTrendPoint[] }) {
  const reduceMotion = useReducedMotion();
  const rows = points.map((point) => ({ ...point, day: formatWeekday(point.date) }));
  const totals = {
    views: points.reduce((s, p) => s + p.views, 0),
    destinationOpens: points.reduce((s, p) => s + p.destinationOpens, 0),
  };

  return (
    <section>
      <SectionHeading>Last 7 days</SectionHeading>
      {/* The chart is pointer-only; screen readers get the same seven days as a table. */}
      <table className="sr-only">
        <caption>Views and opens in the last 7 days</caption>
        <thead>
          <tr><th scope="col">Day</th><th scope="col">Views</th><th scope="col">Opens</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}><th scope="row">{row.day}</th><td>{row.views}</td><td>{row.destinationOpens}</td></tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden className="mt-3">
        <AreaChart
          data={rows}
          config={trendConfig}
          animate={!reduceMotion}
          margins={{ left: 4, bottom: 20, right: 4, top: 8 }}
          className="h-28 w-full"
        >
          <Grid />
          <XAxis dataKey="day" maxTicks={7} />
          <Area dataKey="views" variant="hatched" />
          <Area dataKey="destinationOpens" variant="dotted" />
          <Tooltip labelKey="day" valueFormatter={(value) => formatFull(value)} />
        </AreaChart>
      </div>
      <BlockLegend config={trendConfig} values={totals} valueFormatter={formatMetric} className="mt-2" />
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
    ? [{ label: 'Conversions', value: Math.max(0, conversionSuccessCount) }]
    : [];

  const metrics: MetricItem[] = insights
    ? [
        { label: 'Views', value: insights.lifetime.views },
        { label: 'Unique viewers', value: insights.lifetime.uniqueViewers },
        {
          label: 'Destination opens',
          value: insights.lifetime.destinationOpens,
          hint: insights.lifetime.views > 0 ? `${formatPercent(insights.lifetime.openRate)} open rate` : 'Listen clicks',
        },
        { label: 'Shares', value: insights.lifetime.shares },
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
                No activity <AnnotatedText>yet</AnnotatedText>. Views and opens appear once people open this post.
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

/** The post's artwork color (brand red until it loads), re-toned so cream type stays legible on it in both themes. */
const bandColor = (tint = 'hsl(var(--primary))') => `oklch(from ${tint} 0.42 clamp(0.03, c, 0.13) h)`;
const bandInk = (tint = 'hsl(var(--primary))') => `oklch(from ${tint} 0.96 0.02 h)`;

/** Three positions with the chosen one's summary swapping in beneath. */
function VisibilityControl({ privacy, canLock, choose }: { privacy: PostPrivacy; canLock: boolean; choose: (next: OwnerVisibility) => void }) {
  const visibility = visibilityOf(privacy);
  return (
    <section>
      <SectionHeading>Who can open it</SectionHeading>
      <SegmentedControl
        label="Post visibility"
        className="mt-3 w-full [&_span]:px-1"
        value={privacy}
        onValueChange={(next) => {
          const value = ownerVisibilities.find((option) => option === next);
          if (value) choose(value);
        }}
        options={ownerVisibilities.map((value) => ({
          value,
          label: postVisibility[value].label,
          disabled: value === 'subscriber' && !canLock,
        }))}
      />
      <p key={privacy} className="mt-3 text-pretty text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-280">
        {visibility?.summary ?? 'This post uses an older setting. Choose who can open it.'}
      </p>
    </section>
  );
}

/** A small copy of the locked card fans get on the curator page, so "locked" is concrete. */
function FanPreview() {
  const { user } = useAuthState();
  const name = user?.displayName?.trim() || user?.username || 'you';
  return (
    <section>
      <SectionHeading>What fans see</SectionHeading>
      <div aria-hidden className="card-ink mt-3 flex overflow-hidden">
        <div className="flex size-16 shrink-0 items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          <LockKeyhole className="size-6 text-primary/60" />
        </div>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary">
            <LockKeyhole />
            Members only
          </Badge>
          <p className="mt-1 text-sm font-semibold leading-snug">Members-only post</p>
          <p className="text-pretty text-xs text-muted-foreground">Join {name} to unlock this post.</p>
        </div>
      </div>
    </section>
  );
}

function PlansSection({ access }: { access: ReturnType<typeof useMemberPostAccess> }) {
  return (
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
        // Torn paper, as on the plan's earnings receipt in Curator Studio.
        <div className="relative mb-2 mt-5 bg-card px-4 py-3 font-mono text-xs text-card-foreground">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-2" style={tornEdge('top')} />
          <dl className="space-y-2">
            {access.plans.map((plan) => (
              <ReceiptRow key={plan.id} label={plan.name} value={formatPlanPrice(plan)} />
            ))}
          </dl>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-2 h-2" style={tornEdge('bottom')} />
        </div>
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
  );
}

/* ─── Column and sheet ──────────────────────────────────────────────── */
interface PostStudioContentProps {
  postId: string;
  privacy: PostPrivacy;
  onPrivacyChange: (privacy: OwnerVisibility) => void;
  conversionSuccessCount?: number;
  /** A color from the post's artwork; the head takes it so the column reads as this post's. */
  tint?: string;
}

function PostStudioContent({
  postId,
  privacy,
  onPrivacyChange,
  conversionSuccessCount,
  tint,
  eyebrowAs: Eyebrow = 'p',
  action,
}: PostStudioContentProps & { eyebrowAs?: ElementType; action?: ReactNode }) {
  const visibility = visibilityOf(privacy);
  const StatusIcon = visibility?.icon ?? SlidersHorizontal;
  const access = useMemberPostAccess();
  const updatePost = useUpdatePost();
  const canLock = access.state === 'ready' || privacy === 'subscriber';

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

  const band = bandColor(tint);

  return (
    <>
      {/* A printed label in the artwork's color, dissolving into the paper through the brand's dither seam. */}
      <header
        className="relative px-6 pb-5 pt-5 transition-colors duration-500"
        style={{ backgroundColor: band, color: bandInk(tint) }}
      >
        <div className="flex items-center justify-between gap-3">
          <Eyebrow className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] opacity-75">Your post</Eyebrow>
          {action}
        </div>
        {/* Keyed on the setting so a change crossfades instead of swapping text in place. */}
        <div key={privacy} className="mt-7 flex items-end justify-between gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-280">
          <h2 className="font-teko text-5xl font-bold uppercase leading-[0.8] tracking-tight">
            {visibility?.label ?? 'Visibility'}
          </h2>
          {/* Rubber-stamp mark: a double ring, set a little off true. */}
          <span
            aria-hidden
            className="mb-1 flex size-12 shrink-0 -rotate-12 items-center justify-center rounded-full border-2 border-current opacity-85 outline outline-1 outline-offset-2 outline-current"
          >
            <StatusIcon className="size-5" />
          </span>
        </div>
        <DitherEdge color={band} side="bottom" className="transition-colors duration-500" />
      </header>
      {/* Sections stack with a hairline between them; the receipt and the fan card are the only paper on it. */}
      <div className="divide-y divide-border/70 px-6 pb-6 pt-10 [&>section+section]:pt-5 [&>section]:pb-4 [&>section:last-child]:pb-0">
        <VisibilityControl privacy={privacy} canLock={canLock} choose={choose} />
        {privacy === 'subscriber' && <FanPreview />}
        <PlansSection access={access} />
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
      className={cn('card-quiet w-80 shrink-0 overflow-hidden', className)}
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
            'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-xl border-t border-border bg-background elev-3',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-400 data-[state=closed]:duration-280',
            'data-[state=open]:ease-out-quart data-[state=closed]:ease-in-quart',
          )}
        >
          <PostStudioContent
            {...props}
            eyebrowAs={DialogPrimitive.Title}
            action={
              <DialogPrimitive.Close
                className="-mr-2 rounded-md p-1.5 opacity-75 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
