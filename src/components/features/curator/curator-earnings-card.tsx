'use client';

/** Displays the curator's server-owned member count and paginated earnings history. */

import { useContext, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Banknote, ChevronLeft, ChevronRight, HandCoins, Users } from 'lucide-react';
import { StudioSection, StudioStepsContext } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useAuthState } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { CuratorProfile } from '@/services/curator';
import {
  fetchCuratorEarnings,
  type CuratorEarningsHistoryItem,
} from '@/services/curator-earnings';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const pageSize = 10;
const countFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const dayFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const allocationStatus = {
  accrued: 'Accrued',
  payable: 'Ready for payout',
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

/** `compact` drops the time, the earned line, and the eligibility note for overview lists. */
export function HistoryItem({ item, compact = false }: { item: CuratorEarningsHistoryItem; compact?: boolean }) {
  const showPayableAt = !compact && item.kind === 'allocation' &&
    item.status !== 'transferred' && item.status !== 'forfeited' && item.status !== 'reversed';
  const when = compact ? dayFormatter : dateFormatter;
  const KindIcon = item.kind === 'allocation' ? HandCoins : Banknote;
  const outgoing = item.kind === 'transfer' || item.status === 'forfeited' || item.status === 'reversed';
  const amount = formatPaidPromotionMinorAmount(item.amountMinor, item.currency, 'en-US');
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
          {!compact && item.kind === 'allocation' && item.status === 'accrued' && (
            <p className="mt-0.5 text-xs text-muted-foreground">You earned {amount}</p>
          )}
          {showPayableAt && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Payout eligibility{' '}
              <time dateTime={item.payableAtUtc}>{dateFormatter.format(new Date(item.payableAtUtc))}</time>
            </p>
          )}
        </div>
      </div>
      <p className="pl-10 text-xs text-muted-foreground sm:pl-0 sm:text-sm">
        <time dateTime={item.occurredAtUtc}>{when.format(new Date(item.occurredAtUtc))}</time>
      </p>
      <div className="pl-10 sm:pl-0 sm:text-right">
        <p className={cn('font-mono font-semibold tabular-nums', outgoing && 'text-muted-foreground')}>
          {amount}
        </p>
        <p className="text-xs text-muted-foreground">{statusLabel(item)}</p>
      </div>
    </li>
  );
}

/** Three-column ledger row: description, date, amount. Stacks under `sm`. */
const ledgerRow = 'grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_11rem_8rem] sm:items-start sm:gap-3';

export function CuratorEarningsCard({ profile }: { profile: CuratorProfile }) {
  const { user } = useAuthState();
  const steps = useContext(StudioStepsContext);
  const [page, setPage] = useState(1);
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
  const earnings = query.data;
  const totalPages = earnings
    ? Math.max(1, Math.ceil(earnings.totalItems / earnings.pageSize))
    : 1;
  const hasNextPage = Boolean(
    earnings && earnings.page * earnings.pageSize < earnings.totalItems,
  );
  const showPagination = page > 1 || hasNextPage;

  return (
    <StudioSection
      id="studio-earnings"
      eyebrow="Performance"
      title="Members & earnings"
      headingId="curator-earnings-title"
      testId="curator-earnings-card"
      description="View membership activity and payout history. This history stays available without Curator Pro."
    >
      {query.isPending ? (
        <output className="text-sm text-muted-foreground">Loading members and earnings…</output>
      ) : query.isError || !earnings ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {getUserFacingApiErrorMessage(query.error, 'Members and earnings are unavailable.')}
            {' '}Your other Studio tools still work.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
            {page > 1 && (
              <Button type="button" variant="outline" onClick={() => setPage((current) => current - 1)}>
                Previous page
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-lg bg-muted/40 px-5 py-4">
            <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <dl>
              <dt className="text-xs text-muted-foreground">Active members</dt>
              <dd
                className="mt-0.5 font-teko text-4xl font-bold leading-none tabular-nums"
                data-testid="curator-active-member-count"
              >
                {countFormatter.format(earnings.activeMemberCount)}
              </dd>
            </dl>
          </div>

          <section className="card-ink mt-7 overflow-hidden" aria-labelledby="curator-earnings-history-title">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 id="curator-earnings-history-title" className="text-sm font-semibold">
                Recent activity
              </h3>
              <p className="text-xs text-muted-foreground">Membership earnings and payouts</p>
            </div>
            {earnings.items.length === 0 ? (
              <Empty className="my-3">
                <EmptyTitle>No membership earnings yet</EmptyTitle>
                <EmptyDescription>
                  Earnings appear here as fans join your plan.
                </EmptyDescription>
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
            ) : (
              <>
                <div aria-hidden className={cn(ledgerRow, 'hidden text-xs font-medium text-muted-foreground sm:grid')}>
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
            {showPagination && (
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
        </>
      )}
    </StudioSection>
  );
}
