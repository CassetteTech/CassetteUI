'use client';

/** The Studio Members tab: member counts and a daily trend for a chosen
    window, then the paginated money activity behind them. */

import { useContext, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useReducedMotion } from 'framer-motion';
import { ZodError } from 'zod';
import { Banknote, ChevronLeft, ChevronRight, HandCoins } from 'lucide-react';
import { Area } from '@/components/dither-kit/area';
import { AreaChart } from '@/components/dither-kit/area-chart';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { YAxis } from '@/components/dither-kit/y-axis';
import {
  StudioChip,
  StudioSection,
  StudioStat,
  StudioStepsContext,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
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
import { fetchCuratorMemberStats, type CuratorMemberStats } from '@/services/curator-member-stats';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const pageSize = 10;
const countFormatter = new Intl.NumberFormat('en-US');
/** Day precision: the ledger reads as a statement, and times added noise to every row. */
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
  transferred: 'positive',
  forfeited: 'neutral',
  reversed: 'danger',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'allocation' }>['status'], StudioChipTone>;
const transferTone = {
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

export function HistoryItem({ item }: { item: CuratorEarningsHistoryItem }) {
  const showPayableAt = item.kind === 'allocation' &&
    item.status !== 'transferred' && item.status !== 'forfeited' && item.status !== 'reversed';
  const KindIcon = item.kind === 'allocation' ? HandCoins : Banknote;
  const outgoing = item.kind === 'transfer' || item.status === 'forfeited' || item.status === 'reversed';
  const amount = money(item.amountMinor, item.currency);
  // Structure note: the amount's parent div and grandparent li are how tests
  // associate an amount with its label and status. Keep both wrappers.
  return (
    <li className={cn(ledgerRow, 'transition-colors hover:bg-muted/40')}>
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <KindIcon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{eventTitle(item)}</p>
          {showPayableAt && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Payout eligibility{' '}
              <time dateTime={item.payableAtUtc}>{dateFormatter.format(new Date(item.payableAtUtc))}</time>
            </p>
          )}
        </div>
      </div>
      <p className="pl-10 text-xs text-muted-foreground sm:max-lg:pl-0 sm:max-lg:text-sm xl:pl-0 xl:text-sm">
        <time dateTime={item.occurredAtUtc}>{dateFormatter.format(new Date(item.occurredAtUtc))}</time>
      </p>
      <div className="flex items-center gap-3 pl-10 sm:max-lg:flex-col sm:max-lg:items-end sm:max-lg:gap-1.5 sm:max-lg:pl-0 xl:flex-col xl:items-end xl:gap-1.5 xl:pl-0">
        <p className={cn('font-mono font-semibold tabular-nums', outgoing && 'text-muted-foreground')}>
          {amount}
        </p>
        <StudioChip tone={statusTone(item)} className="whitespace-nowrap">{statusLabel(item)}</StudioChip>
      </div>
    </li>
  );
}

/** Three-column ledger row: description, date, amount. It stacks where the
    Studio panel is narrow: under `sm`, and between `lg` and `xl`, where the
    sidebar and the pass rail share the width. */
const ledgerRow = 'grid gap-1 px-4 py-3 sm:max-lg:grid-cols-[minmax(0,1fr)_11rem_8rem] sm:max-lg:items-start sm:max-lg:gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_8rem] xl:items-start xl:gap-3';

function MemberHealth({ stats }: { stats: CuratorMemberStats }) {
  const reduceMotion = useReducedMotion();
  const since = formatDay(stats.daily[0].date);
  const change = stats.activeMembers - stats.previousWindow.activeMembers;
  const before = (count: number) => `${countFormatter.format(count)} in the ${stats.days} days before`;
  const rows = stats.daily.map((day) => ({ day: formatDay(day.date), members: day.activeMembers }));
  const counts = stats.daily.map((day) => day.activeMembers);

  return (
    <>
      <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <StudioStat
          label="Active members"
          value={countFormatter.format(stats.activeMembers)}
          valueTestId="curator-active-member-count"
          hint={change === 0
            ? `No change since ${since}`
            : `${change > 0 ? '+' : '−'}${countFormatter.format(Math.abs(change))} since ${since}`}
        />
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
      {stats.notRenewingMembers > 0 && (
        <p className="mt-3 text-sm">
          {countFormatter.format(stats.notRenewingMembers)}{' '}
          {stats.notRenewingMembers === 1 ? 'member' : 'members'} will not renew.
        </p>
      )}
      <figure className="mt-5">
        <figcaption className="sr-only">
          Active members went from {counts[0]} on {since} to {counts.at(-1)} today, with a low
          of {Math.min(...counts)} and a high of {Math.max(...counts)}.
        </figcaption>
        <AreaChart
          data={rows}
          config={memberChartConfig}
          animate={!reduceMotion}
          margins={{ left: 28, bottom: 20, right: 8, top: 8 }}
          className="h-44 w-full"
        >
          <Grid />
          {/* Counts are whole members, so fractional ticks stay blank. */}
          <YAxis tickCount={3} tickFormatter={(value) => Number.isInteger(value) ? countFormatter.format(value) : ''} />
          <XAxis dataKey="day" maxTicks={6} />
          <Area dataKey="members" variant="dotted" />
          <Tooltip labelKey="day" valueFormatter={(value) => countFormatter.format(value)} />
        </AreaChart>
      </figure>
      <p className="mt-3 text-xs text-muted-foreground">
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
  // Members exist only after a first publish, the same gate as the Overview ledger.
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

  const noMembers = (title: string, description: string) => (
    <Empty>
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
          <a href="#studio-plan" onClick={() => steps?.open('studio-plan')}>
            Set up a membership plan
          </a>
        </Button>
      )}
    </Empty>
  );
  let members: ReactNode;
  if (plans.isPending || hasPublished && stats.isPending) {
    members = <output className="text-sm text-muted-foreground">Loading members…</output>;
  } else if (!plans.data) {
    // Without the plans the published gate is unknown, so say so rather than
    // show a curator with members the unpublished state.
    members = (
      <RetryAlert error={plans.error} fallback="Member counts are unavailable." onRetry={() => void plans.refetch()} />
    );
  } else if (!hasPublished) {
    members = noMembers('No members yet', 'Publish a plan, and the fans who join it appear here.');
  } else if (stats.isError || !stats.data) {
    members = (
      <RetryAlert error={stats.error} fallback="Member counts are unavailable." onRetry={() => void stats.refetch()} />
    );
  } else if (hasNoMembers(stats.data)) {
    members = noMembers('No active members', `No one joined or left in the last ${stats.data.days * 2} days.`);
  } else {
    // A window switch keeps the last window on screen, dimmed and busy, until the new one lands.
    members = (
      <div
        aria-busy={stats.isPlaceholderData}
        className={cn('transition-opacity motion-reduce:transition-none', stats.isPlaceholderData && 'opacity-60')}
      >
        <MemberHealth stats={stats.data} />
      </div>
    );
  }

  return (
    <StudioSection
      id="studio-earnings"
      eyebrow="Performance"
      title="Members & earnings"
      headingId="curator-earnings-title"
      testId="curator-earnings-card"
      description="Membership activity and payouts."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold">Members</h3>
          {stats.isPlaceholderData && (
            <output className="text-xs text-muted-foreground">Loading {days} days…</output>
          )}
        </div>
        {hasPublished && (
          <SegmentedControl label="Member window" options={memberWindows} value={days} onValueChange={setDays} />
        )}
      </div>
      {members}

      <section className="card-ink mt-7 overflow-hidden" aria-labelledby="curator-earnings-history-title">
        <div className="border-b border-border/70 px-4 py-3">
          <h3 id="curator-earnings-history-title" className="text-sm font-semibold">
            Recent activity
          </h3>
        </div>
        {query.isPending ? (
          <output className="block px-4 py-3 text-sm text-muted-foreground">Loading activity…</output>
        ) : query.isError || !earnings ? (
          <RetryAlert
            error={query.error}
            fallback="Membership earnings are unavailable."
            onRetry={() => void query.refetch()}
            className="px-4 py-3"
          >
            {page > 1 && (
              <Button type="button" variant="outline" onClick={() => setPage((current) => current - 1)}>
                Previous page
              </Button>
            )}
          </RetryAlert>
        ) : earnings.items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No membership earnings yet. Earnings appear here as fans join your plan.
          </p>
        ) : (
          <>
            <div aria-hidden className={cn(ledgerRow, 'hidden text-xs font-medium text-muted-foreground sm:max-lg:grid xl:grid')}>
              <span>Description</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
            </div>
            <ul className="divide-y divide-border/70 border-t border-border/70" data-testid="curator-earnings-history">
              {earnings.items.map((item, index) => (
                <HistoryItem
                  key={`${item.kind}-${item.occurredAtUtc}-${index}`}
                  item={item}
                />
              ))}
            </ul>
          </>
        )}
        {earnings && showPagination && (
          <nav className="flex items-center justify-between gap-3 border-t border-border/70 px-2 py-1.5" aria-label="Earnings history pages">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
              Page {earnings.page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasNextPage || query.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        )}
      </section>
    </StudioSection>
  );
}
