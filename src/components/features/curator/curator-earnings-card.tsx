'use client';

/** The Studio Members tab: the active member count as the hero figure, its
    daily trend for a chosen window, then the paginated money activity behind
    it, printed as a statement grouped by month. */

import { useContext, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import { ZodError } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart } from '@/components/dither-kit/area-chart';
import { Area } from '@/components/dither-kit/area';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { YAxis } from '@/components/dither-kit/y-axis';
import {
  StudioStat,
  StudioStepsContext,
  studioToneText,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
import { studioHref } from '@/components/features/curator/studio-routes';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useAuthState } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { CuratorProfile } from '@/services/curator';
import {
  fetchCuratorEarnings,
  type CuratorEarningsHistoryItem,
} from '@/services/curator-earnings';
import { fetchCuratorMemberStats, memberAxisMax, type CuratorMemberStats } from '@/services/curator-member-stats';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const pageSize = 10;
const countFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDay = (date: string) => dayFormatter.format(new Date(`${date}T00:00:00Z`));
const memberWindows = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];
const memberChartConfig: ChartConfig = { members: { label: 'Active members', color: 'brand' } };
const allocationStatus = {
  accrued: 'Accruing',
  payable: 'Ready to pay out',
  blocked: 'On hold',
  transferred: 'Transferred',
  forfeited: 'Not earned',
  reversed: 'Reversed',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'allocation' }>['status'], string>;
export const transferStatus = {
  created: 'Processing',
  succeeded: 'Paid',
  failed: 'Failed',
  reversed: 'Reversed',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'transfer' }>['status'], string>;

function statusLabel(item: CuratorEarningsHistoryItem) {
  return item.kind === 'allocation'
    ? allocationStatus[item.status]
    : transferStatus[item.status];
}

const allocationTone = {
  accrued: 'neutral',
  payable: 'positive',
  blocked: 'warning',
  transferred: 'neutral',
  forfeited: 'neutral',
  reversed: 'danger',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'allocation' }>['status'], StudioChipTone>;
export const transferTone = {
  created: 'neutral',
  succeeded: 'positive',
  failed: 'danger',
  reversed: 'warning',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'transfer' }>['status'], StudioChipTone>;

function statusTone(item: CuratorEarningsHistoryItem): StudioChipTone {
  return item.kind === 'allocation' ? allocationTone[item.status] : transferTone[item.status];
}

const money = (amountMinor: number, currency: string) =>
  formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');

const transferEventTitle = {
  created: 'Payout pending',
  succeeded: 'Payout sent',
  failed: 'Payout failed',
  reversed: 'Payout reversed',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'transfer' }>['status'], string>;

/** Activity-stream event name per history item. */
export function eventTitle(item: CuratorEarningsHistoryItem) {
  if (item.kind === 'transfer') return transferEventTitle[item.status];
  if (item.status === 'forfeited') return 'Earning forfeited';
  if (item.status === 'reversed') return 'Earning reversed';
  return 'New member earning';
}

/** Consecutive items that share a calendar month; the ledger arrives newest first. */
function byMonth(items: CuratorEarningsHistoryItem[]) {
  const groups: Array<{ month: string; items: CuratorEarningsHistoryItem[] }> = [];
  for (const item of items) {
    const month = monthFormatter.format(new Date(item.occurredAtUtc));
    const last = groups.at(-1);
    if (last?.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

/** One statement line: day, event, then amount over status. */
function HistoryItem({ item }: { item: CuratorEarningsHistoryItem }) {
  const showPayableAt = item.kind === 'allocation' &&
    item.status !== 'transferred' && item.status !== 'forfeited' && item.status !== 'reversed';
  const outgoing = item.kind === 'transfer' || item.status === 'forfeited' || item.status === 'reversed';
  // Structure note: the amount's parent div and grandparent li are how tests
  // associate an amount with its label and status. Keep both wrappers.
  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-3">
      <time dateTime={item.occurredAtUtc} className="font-mono text-xs uppercase tabular-nums text-muted-foreground">
        {dayFormatter.format(new Date(item.occurredAtUtc))}
      </time>
      <div className="min-w-0">
        <p className="truncate text-sm">{eventTitle(item)}</p>
        {showPayableAt && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Payout eligibility{' '}
            <time dateTime={item.payableAtUtc}>{dateFormatter.format(new Date(item.payableAtUtc))}</time>
          </p>
        )}
      </div>
      <div className="text-right">
        <p className={cn('font-mono text-sm tabular-nums', outgoing && 'text-muted-foreground')}>
          {money(item.amountMinor, item.currency)}
        </p>
        <p className={cn('mt-0.5 text-xs', studioToneText[statusTone(item)])}>{statusLabel(item)}</p>
      </div>
    </li>
  );
}

/** The hero figure: today's count, its change over the window, and pending endings. */
function MemberCount({ stats }: { stats: CuratorMemberStats }) {
  const change = stats.activeMembers - stats.previousWindow.activeMembers;
  const since = formatDay(stats.daily[0].date);
  return (
    <>
      <p className="mt-1 font-teko text-5xl font-bold leading-none tabular-nums" data-testid="curator-active-member-count">
        {countFormatter.format(stats.activeMembers)}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {change === 0
          ? `No change since ${since}`
          : `${change > 0 ? '+' : '−'}${countFormatter.format(Math.abs(change))} since ${since}`}
      </p>
      {stats.notRenewingMembers > 0 && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {countFormatter.format(stats.notRenewingMembers)}{' '}
          {stats.notRenewingMembers === 1 ? 'member' : 'members'} will not renew.
        </p>
      )}
    </>
  );
}

/** The window's joins and endings beside the previous window, then the daily trend. */
function MemberTrend({ stats }: { stats: CuratorMemberStats }) {
  const reduceMotion = useReducedMotion();
  const since = formatDay(stats.daily[0].date);
  const before = (count: number) => `${countFormatter.format(count)} in the ${stats.days} days before`;
  const rows = stats.daily.map((day) => ({ day: formatDay(day.date), members: day.activeMembers }));
  const counts = stats.daily.map((day) => day.activeMembers);

  return (
    <>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StudioStat
          label="New members"
          value={countFormatter.format(stats.newMembers)}
          valueTestId="curator-new-member-count"
          hint={before(stats.previousWindow.newMembers)}
        />
        <StudioStat
          label="Ended"
          value={countFormatter.format(stats.endedMembers)}
          valueTestId="curator-ended-member-count"
          hint={before(stats.previousWindow.endedMembers)}
        />
      </dl>
      <figure className="mt-6">
        <figcaption className="sr-only">
          Active members went from {counts[0]} on {since} to {counts.at(-1)} today, with a low
          of {Math.min(...counts)} and a high of {Math.max(...counts)}.
        </figcaption>
        <AreaChart
          data={rows}
          config={memberChartConfig}
          yMax={memberAxisMax(Math.max(...counts))}
          animate={!reduceMotion}
          margins={{ left: 28, bottom: 20, right: 8, top: 8 }}
          className="h-56 w-full"
        >
          <Grid />
          {/* Counts are whole members, so fractional ticks stay blank. */}
          <YAxis tickCount={3} tickFormatter={(value) => Number.isInteger(value) ? countFormatter.format(value) : ''} />
          <XAxis dataKey="day" maxTicks={6} />
          <Area dataKey="members" variant="dotted" />
          <Tooltip labelKey="day" valueFormatter={(value) => countFormatter.format(value)} />
        </AreaChart>
      </figure>
      <p className="mt-4 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        A membership counts as ended on the day its access ends, not the day the fan cancels.
      </p>
    </>
  );
}

/** One Studio failure line with a retry. A response that failed parsing gets
    the fallback, never the parser's text. */
function RetryAlert({
  error,
  fallback,
  onRetry,
  className,
  children,
}: {
  error: unknown;
  fallback: string;
  onRetry: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <p role="alert" className="text-sm text-destructive">
        {getUserFacingApiErrorMessage(error instanceof ZodError ? undefined : error, fallback)}
        {' '}Your other Studio tools still work.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
        {children}
      </div>
    </div>
  );
}

const hasNoMembers = (stats: CuratorMemberStats) =>
  [stats.activeMembers, stats.newMembers, stats.endedMembers, ...Object.values(stats.previousWindow)]
    .every((count) => count === 0);

export function CuratorEarningsCard({ profile }: { profile: CuratorProfile }) {
  const { user } = useAuthState();
  const steps = useContext(StudioStepsContext);
  const [page, setPage] = useState(1);
  const [days, setDays] = useState('30');
  const query = useQuery({
    queryKey: ['curator-earnings', user?.id ?? null, page, pageSize],
    queryFn: ({ signal }) => fetchCuratorEarnings(page, pageSize, signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  // Shares the plan card's query key, so React Query dedupes the request.
  const plans = useQuery({
    queryKey: ['curator-plans', profile.id],
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    staleTime: 0,
  });
  const hasActivePlan = plans.data?.some((plan) => plan.status === 'active') === true;
  // Members exist only after a first publish, the same gate as the earnings ledger.
  const hasPublished = plans.data?.some((plan) => plan.status !== 'draft') === true;
  const stats = useQuery({
    queryKey: ['curator-member-stats', user?.id ?? null, profile.id, days],
    queryFn: ({ signal }) => fetchCuratorMemberStats(Number(days), signal),
    enabled: Boolean(user?.id) && hasPublished,
    // A window switch keeps the last figures on screen until the new ones land.
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const earnings = query.data;
  const totalPages = earnings
    ? Math.max(1, Math.ceil(earnings.totalItems / earnings.pageSize))
    : 1;
  const hasNextPage = Boolean(
    earnings && earnings.page * earnings.pageSize < earnings.totalItems,
  );
  const showPagination = page > 1 || hasNextPage;

  // Empty states take the chart's height, the same as the earnings card's empty chart.
  const noMembers = (title: string, description: string) => (
    <Empty className="mt-6 h-56 py-0">
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
      {hasActivePlan && user?.username ? (
        <Button asChild variant="outline">
          <Link href={`/profile/${encodeURIComponent(user.username)}`}>
            View your public profile
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link
            href={studioHref('studio-plan')}
            onNavigate={(event) => {
              event.preventDefault();
              steps?.open('studio-plan');
            }}
          >
            Set up a membership plan
          </Link>
        </Button>
      )}
    </Empty>
  );
  let hero: ReactNode = null;
  let members: ReactNode;
  if (plans.isPending || hasPublished && stats.isPending) {
    members = <output className="mt-1.5 block text-sm text-muted-foreground">Loading members…</output>;
  } else if (!plans.data) {
    // Without the plans the published gate is unknown, so say so rather than
    // show a curator with members the unpublished state.
    members = (
      <RetryAlert className="mt-3" error={plans.error} fallback="Member counts are unavailable." onRetry={() => void plans.refetch()} />
    );
  } else if (!hasPublished) {
    members = noMembers('No members yet', 'Publish a plan, and the fans who join it appear here.');
  } else if (stats.isError || !stats.data) {
    members = (
      <RetryAlert className="mt-3" error={stats.error} fallback="Member counts are unavailable." onRetry={() => void stats.refetch()} />
    );
  } else if (hasNoMembers(stats.data)) {
    members = noMembers('No active members', `No one joined or left in the last ${stats.data.days * 2} days.`);
  } else {
    hero = <MemberCount stats={stats.data} />;
    members = <MemberTrend stats={stats.data} />;
  }
  // A window switch keeps the last window on screen, dimmed and busy, until the new one lands.
  const dimmed = cn('transition-opacity motion-reduce:transition-none', stats.isPlaceholderData && 'opacity-60');

  return (
    // Both panels share the view's anchor, so step links land on the hero and tests read one card.
    <div id="studio-members" data-testid="curator-earnings-card" tabIndex={-1} className="scroll-mt-24 space-y-6 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <section aria-labelledby="curator-earnings-title" aria-busy={stats.isPlaceholderData} className="card-quiet px-5 py-5 sm:px-6">
        {/* The earnings card's hero shape: label and figure on the left, the window control on the right. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="curator-earnings-title" className="text-xs text-muted-foreground">Active members</h2>
            {hero && <div className={dimmed}>{hero}</div>}
          </div>
          {hasPublished && (
            <div className="flex items-center gap-3">
              {stats.isPlaceholderData && (
                <output className="text-xs text-muted-foreground">Loading {days} days…</output>
              )}
              <SegmentedControl label="Member window" options={memberWindows} value={days} onValueChange={setDays} />
            </div>
          )}
        </div>
        <div className={dimmed}>{members}</div>
      </section>

      <section aria-labelledby="curator-earnings-history-title" className="card-quiet px-5 py-5 sm:px-6">
        <h2 id="curator-earnings-history-title" className="text-sm font-semibold">Activity</h2>
        {query.isPending ? (
          <output className="mt-3 block text-sm text-muted-foreground">Loading activity…</output>
        ) : query.isError || !earnings ? (
          <RetryAlert
            error={query.error}
            fallback="Membership earnings are unavailable."
            onRetry={() => void query.refetch()}
            className="mt-3"
          >
            {page > 1 && (
              <Button type="button" variant="outline" onClick={() => setPage((current) => current - 1)}>
                Previous page
              </Button>
            )}
          </RetryAlert>
        ) : earnings.items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No membership earnings yet. Earnings appear here as fans join your plan.
          </p>
        ) : (
          // A statement: each month opens with a dashed rule, the receipt's device.
          <div className="mt-4 space-y-5" data-testid="curator-earnings-history">
            {byMonth(earnings.items).map((group) => (
              <section key={group.month} aria-label={group.month}>
                <h3 className="flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {group.month}
                  <span aria-hidden className="flex-1 border-t border-dashed border-border" />
                </h3>
                <ul className="divide-y divide-border/60">
                  {group.items.map((item, index) => (
                    <HistoryItem key={`${item.kind}-${item.occurredAtUtc}-${index}`} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {earnings && showPagination && (
          <nav className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3" aria-label="Earnings history pages">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-3"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="font-mono text-xs tabular-nums text-muted-foreground" aria-live="polite">
              Page {earnings.page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-3"
              disabled={!hasNextPage || query.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}
