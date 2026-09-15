'use client';

/** Balance breakdown and transfer history from the curator's earnings ledger.
    Sits beside the payout account card; only shows once payout setup started. */

import { useContext } from 'react';
import { transferStatus } from '@/components/features/curator/curator-earnings-card';
import { ReceiptRow, StudioChip, StudioSection, StudioStepsContext, type StudioChipTone } from '@/components/features/curator/studio-shell';
import { useCuratorLedger } from '@/components/features/curator/use-curator-ledger';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CuratorEarningsHistoryItem } from '@/services/curator-earnings';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const money = (amountMinor: number, currency: string) =>
  formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');

type Transfer = Extract<CuratorEarningsHistoryItem, { kind: 'transfer' }>;

const transferTone = {
  created: 'neutral',
  succeeded: 'positive',
  failed: 'danger',
  reversed: 'warning',
} satisfies Record<Transfer['status'], StudioChipTone>;

export function CuratorPayoutHistory({ enabled }: { enabled: boolean }) {
  const views = useContext(StudioStepsContext);
  const query = useCuratorLedger(enabled);
  const ledger = query.data;
  const balances = ledger?.balances;
  const transfers = ledger?.items.filter((item): item is Transfer => item.kind === 'transfer') ?? [];

  return (
    <StudioSection
      id="studio-payout-history"
      eyebrow="Get paid"
      title="Payout history"
      headingId="curator-payout-history-title"
      description="Where your membership earnings stand, and every payout sent to your account."
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
          <dl className="divide-y divide-border/70 text-sm">
            <ReceiptRow className="py-2.5" label="Accruing" value={money(balances.accrued, balances.currency)} />
            <ReceiptRow className="py-2.5" label="Ready to pay out" value={money(balances.payable, balances.currency)} />
            {balances.blocked > 0 && (
              <ReceiptRow className="py-2.5" label="On hold" value={money(balances.blocked, balances.currency)} deduction />
            )}
            <ReceiptRow className="py-2.5" label="Paid out" value={money(balances.paidOut, balances.currency)} emphasized />
          </dl>

          <h3 className="mt-7 text-sm font-semibold">Payouts</h3>
          {transfers.length === 0 ? (
            <Empty className="mt-3">
              <EmptyTitle>No payouts yet</EmptyTitle>
              <EmptyDescription>
                Earnings are sent to your account on your payout schedule once they clear.
              </EmptyDescription>
            </Empty>
          ) : (
            <Table className="mt-2">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-0 text-xs font-medium text-muted-foreground">Date</TableHead>
                  <TableHead className="px-0 text-right text-xs font-medium text-muted-foreground">Amount</TableHead>
                  <TableHead className="px-0 text-right text-xs font-medium text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((item, index) => (
                  <TableRow key={`${item.occurredAtUtc}-${index}`} className="hover:bg-transparent">
                    <TableCell className="px-0 py-3">
                      <time dateTime={item.occurredAtUtc} className="font-mono text-sm tabular-nums">
                        {dateFormatter.format(new Date(item.occurredAtUtc))}
                      </time>
                    </TableCell>
                    <TableCell className="px-0 py-3 text-right font-mono font-semibold tabular-nums">
                      {money(item.amountMinor, item.currency)}
                    </TableCell>
                    <TableCell className="px-0 py-3 text-right">
                      <StudioChip tone={transferTone[item.status]}>{transferStatus[item.status]}</StudioChip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {query.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full sm:w-auto"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </>
      )}
    </StudioSection>
  );
}
