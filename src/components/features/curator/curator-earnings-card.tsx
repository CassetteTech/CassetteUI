'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthState } from '@/hooks/use-auth';
import {
  fetchCuratorEarnings,
  type CuratorEarningsHistoryItem,
} from '@/services/curator-earnings';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

const pageSize = 10;
const countFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
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

function HistoryItem({ item }: { item: CuratorEarningsHistoryItem }) {
  const showPayableAt = item.kind === 'allocation' &&
    item.status !== 'transferred' && item.status !== 'forfeited' && item.status !== 'reversed';
  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-medium">
          {item.kind === 'allocation' ? 'Membership earning' : 'Payout transfer'}
        </p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={item.occurredAtUtc}>{dateFormatter.format(new Date(item.occurredAtUtc))}</time>
        </p>
      </div>
      <div className="sm:text-right">
        <p className="font-semibold">
          {formatPaidPromotionMinorAmount(item.amountMinor, item.currency, 'en-US')}
        </p>
        <p className="text-sm text-muted-foreground">{statusLabel(item)}</p>
        {showPayableAt && (
          <p className="text-xs text-muted-foreground">
            Payout eligibility{' '}
            <time dateTime={item.payableAtUtc}>{dateFormatter.format(new Date(item.payableAtUtc))}</time>
          </p>
        )}
      </div>
    </li>
  );
}

export function CuratorEarningsCard() {
  const { user } = useAuthState();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['curator-earnings', user?.id ?? null, page, pageSize],
    queryFn: ({ signal }) => fetchCuratorEarnings(page, pageSize, signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const earnings = query.data;
  const hasNextPage = Boolean(
    earnings && earnings.page * earnings.pageSize < earnings.totalItems,
  );
  const showPagination = page > 1 || hasNextPage;

  return (
    <Card data-testid="curator-earnings-card" aria-labelledby="curator-earnings-title">
      <CardHeader>
        <h2 id="curator-earnings-title" className="text-xl font-semibold">Members &amp; earnings</h2>
        <p className="text-sm text-muted-foreground">
          View membership activity and payout history. This history stays available without Curator Pro.
        </p>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <output className="text-sm text-muted-foreground">Loading members and earnings…</output>
        ) : query.isError || !earnings ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              Members and earnings are unavailable. Your other Studio tools still work.
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
            <dl className="rounded-md border bg-muted/30 p-4">
              <dt className="text-sm text-muted-foreground">Active members</dt>
              <dd className="mt-1 text-2xl font-semibold" data-testid="curator-active-member-count">
                {countFormatter.format(earnings.activeMemberCount)}
              </dd>
            </dl>

            <section className="mt-6" aria-labelledby="curator-earnings-history-title">
              <h3 id="curator-earnings-history-title" className="font-semibold">Earnings history</h3>
              {earnings.items.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No membership earnings yet.</p>
              ) : (
                <ul className="mt-2 divide-y" data-testid="curator-earnings-history">
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
              <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Earnings history pages">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  Page {earnings.page}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!hasNextPage || query.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
