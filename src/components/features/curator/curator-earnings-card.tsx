'use client';

/** Displays the curator's server-owned member count and paginated earnings history. */

import { useContext, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Banknote, HandCoins, Users } from 'lucide-react';
import { StudioSection, StudioStepsContext } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useAuthState } from '@/hooks/use-auth';
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
const allocationStatus = {
  accrued: 'Accrued',
  payable: 'Ready for payout',
  blocked: 'On hold',
  transferred: 'Transferred',
  forfeited: 'Not earned',
  reversed: 'Reversed',
} satisfies Record<Extract<CuratorEarningsHistoryItem, { kind: 'allocation' }>['status'], string>;
const transferStatus = {
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
function eventTitle(item: CuratorEarningsHistoryItem) {
  if (item.kind === 'transfer') return transferEventTitle[item.status];
  if (item.status === 'forfeited') return 'Earning forfeited';
  if (item.status === 'reversed') return 'Earning reversed';
  return 'New member earning';
}

function HistoryItem({ item }: { item: CuratorEarningsHistoryItem }) {
  const showPayableAt = item.kind === 'allocation' &&
    item.status !== 'transferred' && item.status !== 'forfeited' && item.status !== 'reversed';
  const KindIcon = item.kind === 'allocation' ? HandCoins : Banknote;
  // Structure note: the amount's parent div and grandparent li are how tests
  // associate an amount with its label and status. Keep both wrappers.
  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground">
          <KindIcon className="size-4" />
        </span>
        <div>
          <p className="font-medium leading-tight">{eventTitle(item)}</p>
          {item.kind === 'allocation' && item.status === 'accrued' && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              You earned {formatPaidPromotionMinorAmount(item.amountMinor, item.currency, 'en-US')}
            </p>
          )}
          <p className="mt-0.5 text-sm text-muted-foreground">
            <time dateTime={item.occurredAtUtc}>{dateFormatter.format(new Date(item.occurredAtUtc))}</time>
          </p>
        </div>
      </div>
      <div className="pl-11 sm:pl-0 sm:text-right">
        <p className="font-mono font-semibold tabular-nums">
          {formatPaidPromotionMinorAmount(item.amountMinor, item.currency, 'en-US')}
        </p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          {statusLabel(item)}
        </p>
        {showPayableAt && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Payout eligibility{' '}
            <time dateTime={item.payableAtUtc}>{dateFormatter.format(new Date(item.payableAtUtc))}</time>
          </p>
        )}
      </div>
    </li>
  );
}

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
          <div className="flex items-center gap-4 bg-muted/30 px-5 py-4">
            <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <dl>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Active members
              </dt>
              <dd
                className="mt-0.5 font-teko text-4xl font-bold leading-none tabular-nums"
                data-testid="curator-active-member-count"
              >
                {countFormatter.format(earnings.activeMemberCount)}
              </dd>
            </dl>
          </div>

          <section className="mt-7" aria-labelledby="curator-earnings-history-title">
            <h3 id="curator-earnings-history-title" className="font-teko text-xl font-semibold uppercase tracking-tight">
              Recent activity
            </h3>
            {earnings.items.length === 0 ? (
              <Empty className="mt-3">
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
              <ul className="mt-2 divide-y divide-border/70" data-testid="curator-earnings-history">
                {earnings.items.map((item, index) => (
                  <HistoryItem
                    key={`${item.kind}-${item.occurredAtUtc}-${index}`}
                    item={item}
                  />
                ))}
              </ul>
            )}
          </section>

          {showPagination && (
            <nav className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-border pt-4" aria-label="Earnings history pages">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground" aria-live="polite">
                Page {earnings.page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNextPage || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </StudioSection>
  );
}
