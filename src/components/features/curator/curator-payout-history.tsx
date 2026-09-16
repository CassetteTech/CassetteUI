'use client';

/** Balance tiles, payouts by month, and the transfer list from the curator's
    earnings ledger. Sits beside the payout account card; only shows once
    payout setup started. List layout after opensourceui.in's
    recent-transactions-table (MIT), on the theme tokens. */

import { useContext } from 'react';
import { transferStatus } from '@/components/features/curator/curator-earnings-card';
import { StudioChip, StudioSection, StudioStat, StudioStepsContext, type StudioChipTone } from '@/components/features/curator/studio-shell';
import { useCuratorLedger } from '@/components/features/curator/use-curator-ledger';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CuratorEarningsHistoryItem } from '@/services/curator-earnings';
import { monthStart } from '@/services/curator-earnings';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const money = (amountMinor: number, currency: string) =>
  formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');

type Transfer = Extract<CuratorEarningsHistoryItem, { kind: 'transfer' }>;

const transferTone = {
  created: 'neutral',
  succeeded: 'positive',
  failed: 'danger',
  reversed: 'warning',
} satisfies Record<Transfer['status'], StudioChipTone>;

const chartMonths = 6;

/** Succeeded payouts summed per month over the trailing window, oldest first. */
function payoutsByMonth(transfers: Transfer[]) {
  const months = Array.from({ length: chartMonths }, (_, index) => monthStart(chartMonths - 1 - index));
  return months.map((start, index) => {
    const end = index + 1 < months.length ? months[index + 1] : new Date(8.64e15);
    const total = transfers
      .filter((item) => item.status === 'succeeded')
      .filter((item) => {
        const at = new Date(item.occurredAtUtc);
        return at >= start && at < end;
      })
      .reduce((sum, item) => sum + item.amountMinor, 0);
    return { label: monthFormatter.format(start), total };
  });
}

export function CuratorPayoutHistory({ enabled }: { enabled: boolean }) {
  const views = useContext(StudioStepsContext);
  const query = useCuratorLedger(enabled);
  const ledger = query.data;
  const balances = ledger?.balances;
  const transfers = ledger?.items.filter((item): item is Transfer => item.kind === 'transfer') ?? [];
  const months = payoutsByMonth(transfers);
  const monthMax = Math.max(...months.map((month) => month.total), 0);

  return (
    <StudioSection
      id="studio-payout-history"
      eyebrow="Get paid"
      title="Payout history"
      headingId="curator-payout-history-title"
    >
      {!enabled ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Payout history appears here once payout setup has started.</p>
          <Button variant="outline" onClick={() => views?.open('studio-payouts')}>Go to payout setup</Button>
        </div>
      ) : query.isPending ? (
        <>
          <output className="sr-only">Loading payout history…</output>
          <div aria-hidden className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-6 h-32 w-full" />
          </div>
        </>
      ) : query.isError || !ledger || !balances ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            Could not load payout history. Your other Studio tools still work.
          </p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StudioStat label="Accruing" value={money(balances.accrued, balances.currency)} />
            <StudioStat label="Ready to pay out" value={money(balances.payable, balances.currency)} />
            {balances.blocked > 0 && (
              <StudioStat label="On hold" value={money(balances.blocked, balances.currency)} />
            )}
            <StudioStat label="Paid out" value={money(balances.paidOut, balances.currency)} />
          </dl>

          {/* Transfer list in the transactions-table shape: description, date, signed amount. */}
          <section aria-labelledby="curator-payouts-list-title" className="card-ink mt-6 overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div>
                <h3 id="curator-payouts-list-title" className="text-sm font-semibold">Payouts</h3>
                {transfers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {ledger.coversWindow ? `${transfers.length} sent` : `Latest ${transfers.length} loaded`}
                  </p>
                )}
              </div>
              {monthMax > 0 && (
                <ol className="flex h-12 items-end gap-1.5" aria-label={`Payouts by month, last ${chartMonths} months`}>
                  {months.map((month) => (
                    <li key={month.label} className="flex w-7 flex-col items-center gap-1" title={`${month.label}: ${money(month.total, balances.currency)}`}>
                      <span
                        className={cn('w-full rounded-sm', month.total > 0 ? 'bg-primary' : 'bg-border/70')}
                        style={{ height: `${Math.max(3, (month.total / monthMax) * 32)}px` }}
                      />
                      <span className="font-mono text-[9px] uppercase text-muted-foreground">{month.label}</span>
                      <span className="sr-only">{money(month.total, balances.currency)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            {transfers.length === 0 ? (
              <Empty className="m-3 border-none">
                <EmptyTitle>No payouts yet</EmptyTitle>
                <EmptyDescription>Cleared earnings go out on your payout schedule.</EmptyDescription>
              </Empty>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">Description</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((item, index) => (
                    <tr key={`${item.occurredAtUtc}-${index}`} className="border-t border-border/70 transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          Payout
                          <StudioChip tone={transferTone[item.status]}>{transferStatus[item.status]}</StudioChip>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <time dateTime={item.occurredAtUtc} className="font-mono text-xs tabular-nums sm:text-sm">
                          {dateFormatter.format(new Date(item.occurredAtUtc))}
                        </time>
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-mono font-semibold tabular-nums',
                          item.status === 'succeeded' ? 'text-success-text' : item.status === 'created' ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {item.status === 'succeeded' ? '+' : ''}{money(item.amountMinor, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {query.hasNextPage && (
              <div className="border-t border-border/70 px-4 py-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </StudioSection>
  );
}
