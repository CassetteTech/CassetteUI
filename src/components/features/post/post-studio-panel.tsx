'use client';

import { useEffect, useState, type ElementType, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useReducedMotion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Area } from '@/components/dither-kit/area';
import { AreaChart } from '@/components/dither-kit/area-chart';
import { BlockLegend } from '@/components/dither-kit/block-legend';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { AnnotatedText } from '@/components/ui/annotated-text';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { visibilityOf, type OwnerVisibility } from '@/components/features/post/post-visibility';
import { PostVisibilityControl } from '@/components/features/post/post-visibility-control';
import { useUpdatePost } from '@/hooks/use-music';
import { ApiError, apiService } from '@/services/api';
import type { PostInsightsPlatformBreakdownItem, PostInsightsResponse, PostInsightsTrendPoint, PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';
import { ValueFlash } from '@/components/ui/interior/value-flash';

type InsightsStatus = 'loading' | 'success' | 'error';

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

function SectionHeading({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold">{children}</h3>
      {meta ? <div className="text-xs tabular-nums text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

type MetricItem = { label: string; value: number; hint?: string };

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

function InsightsAccess(props: { postId: string; conversionSuccessCount?: number }) {
  const { user } = useAuthState();
  const pro = useQuery({
    queryKey: ['curator-pro-status', user?.id ?? null],
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const status = query.state.data;
      const remaining = status?.cancelAtPeriodEnd && status.paidThroughUtc
        ? Date.parse(status.paidThroughUtc) - Date.now()
        : 30_000;
      return remaining > 0 ? Math.max(100, Math.min(30_000, remaining)) : 30_000;
    },
  });
  const status = pro.data;
  const hasAccess = Boolean(user?.id) && pro.isFetchedAfterMount && !pro.isError && status?.hasAccess &&
    (!status.cancelAtPeriodEnd || (status.paidThroughUtc !== null && Date.parse(status.paidThroughUtc) > Date.now()));

  if (hasAccess) return <InsightsSections key={user?.id} {...props} />;

  return (
    <section data-testid="post-insights-locked">
      <SectionHeading>Insights</SectionHeading>
      <p className="mt-3 text-sm text-muted-foreground">
        {pro.isPending ? 'Checking audience insights access…' : pro.isError
          ? 'Audience insights access could not be checked.'
          : 'Post audience insights are part of Curator Pro.'}
      </p>
      {pro.isError && <Button variant="outline" size="sm" className="mt-3" onClick={() => void pro.refetch()}>Try again</Button>}
      {!pro.isError && status?.available && status.canSubscribe && (
        <Link href="/studio/payouts" prefetch={false} className="mt-3 inline-block text-sm underline underline-offset-2">
          View Curator Pro
        </Link>
      )}
    </section>
  );
}

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
                No views <AnnotatedText>yet</AnnotatedText>.
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
  eyebrowAs: Eyebrow = 'p',
  action,
}: PostStudioContentProps & { eyebrowAs?: ElementType; action?: ReactNode }) {
  const visibility = visibilityOf(privacy);
  const updatePost = useUpdatePost();

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
      <header className="border-b border-border/70 px-6 pb-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Your post</Eyebrow>
          {action}
        </div>
        <h2
          key={privacy}
          className="mt-5 whitespace-nowrap font-teko text-4xl font-bold uppercase leading-[0.8] tracking-tight text-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-280"
        >
          {visibility?.label ?? 'Visibility'}
        </h2>
      </header>
      <div className="divide-y divide-border/70 px-6 pb-6 pt-5 [&>section+section]:pt-5 [&>section]:pb-4 [&>section:last-child]:pb-0">
        <PostVisibilityControl privacy={privacy} choose={choose} />
        <InsightsAccess postId={postId} conversionSuccessCount={conversionSuccessCount} />
      </div>
    </>
  );
}

export function PostStudioColumn({
  className,
  ref,
  ...props
}: PostStudioContentProps & { className?: string; ref?: Ref<HTMLElement> }) {
  return (
    <aside
      ref={ref}
      aria-label="Your post"
      data-testid="post-studio-panel"
      className={cn('card-quiet w-80 shrink-0 overflow-hidden', className)}
    >
      <PostStudioContent {...props} />
    </aside>
  );
}

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
