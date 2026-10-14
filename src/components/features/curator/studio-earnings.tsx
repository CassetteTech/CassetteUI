'use client';

/** Earnings on the Membership view after the first publish: the hero figure for a chosen period,
    the payout figures, and the dithered earned-versus-paid chart. */

import { useContext, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Area } from '@/components/dither-kit/area';
import { AreaChart } from '@/components/dither-kit/area-chart';
import { BlockLegend } from '@/components/dither-kit/block-legend';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { YAxis } from '@/components/dither-kit/y-axis';
import { StudioStat, StudioStepsContext } from '@/components/features/curator/studio-shell';
import { useCuratorLedger } from '@/components/features/curator/use-curator-ledger';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { AnnotatedText } from '@/components/ui/annotated-text';
import { Skeleton } from '@/components/ui/skeleton';
import { periodSummary, type CuratorEarningsBalances } from '@/services/curator-earnings';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { cn } from '@/lib/utils';

const countFormatter = new Intl.NumberFormat('en-US');
const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const money = (amountMinor: number, currency: string) =>
  formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');

const periods = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
];
// Paid out is registered first so the earned series paints on top of it.
const chartConfig: ChartConfig = {
  paid: { label: 'Paid out', color: 'grey' },
  earned: { label: 'Earned', color: 'brand' },
};
/** Whole units keep the y axis short ("$27", not "$27.00"). */
const axisMoney = (currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });

function nextPayout(balances: CuratorEarningsBalances) {
  if (balances.payable > 0) return { value: 'Ready', hint: 'Sent on your payout schedule' };
  if (balances.nextPayableAt) {
    return { value: dayFormatter.format(new Date(balances.nextPayableAt)), hint: 'When accrued earnings clear' };
  }
  return { value: 'None yet', hint: 'Nothing is waiting for payout' };
}

/** Rendered only after the first publish; before it there are no earnings. */
export function StudioEarnings() {
  const views = useContext(StudioStepsContext);
  const earnings = useCuratorLedger(true);
  const ledger = earnings.data;
  const [months, setMonths] = useState('6');
  const period = useMemo(
    () => ledger ? periodSummary(ledger.items, ledger.totalItems, Number(months)) : null,
    [ledger, months],
  );
  const balances = ledger?.balances;
  const currency = balances?.currency ?? 'USD';
  const axis = useMemo(() => axisMoney(currency), [currency]);
  // The ledger is read newest-first up to a page cap; say so when the window is cut short.
  const windowHint = ledger && !ledger.coversWindow
    ? `From your latest ${countFormatter.format(ledger.items.length)} ledger events`
    : null;
  const figures = ledger && balances
    ? [
        {
          label: 'Ready to pay out',
          value: money(balances.payable, currency),
          hint: balances.accrued > 0
            ? `${money(balances.accrued, currency)} more still accruing`
            : 'Cleared and waiting to be sent',
          target: 'studio-payouts',
        },
        { label: 'Next payout', target: 'studio-payouts', ...nextPayout(balances) },
      ]
    : [
        { label: 'Ready to pay out', target: 'studio-payouts' },
        { label: 'Next payout', target: 'studio-payouts' },
      ].map((figure) => ({
        ...figure,
        value: '—',
        hint: earnings.isError ? 'Unavailable right now' : 'Loading…',
      }));
  const reduceMotion = useReducedMotion();

  // Earned is the hero figure, so the totals line holds the period's other outcomes.
  const summary = period
    ? [
        { label: 'Paid out', value: money(period.paid, currency) },
        { label: 'Not earned', value: money(period.forfeited, currency), muted: true },
      ]
    : [];

  // Stripe Express shape: the hero figure and its period control, the payout figures, then the chart at full width.
  return (
    <section aria-labelledby="studio-earned-title" className="card-quiet px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="studio-earned-title" className="text-xs text-muted-foreground">Earned</h2>
          <p className="mt-1 font-teko text-5xl font-bold leading-none tabular-nums">
            {period ? money(period.earned, currency) : '—'}
          </p>
          {earnings.isPending ? (
            <output className="mt-1.5 block text-xs text-muted-foreground">Loading earnings…</output>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {period
                ? `From members in the last ${months} months${period.complete ? '.' : `. ${windowHint}.`}`
                : 'Earnings are unavailable right now. Try again in a moment.'}
            </p>
          )}
        </div>
        <SegmentedControl label="Earnings period" options={periods} value={months} onValueChange={setMonths} />
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        {figures.map((figure) => (
          <StudioStat
            key={figure.label}
            label={figure.label}
            value={figure.value}
            hint={figure.hint}
            onClick={() => views?.open(figure.target)}
          />
        ))}
      </dl>

      {earnings.isPending ? (
        <Skeleton className="mt-6 h-56 w-full" />
      ) : period && (
        <>
          {period.earned + period.paid === 0 ? (
            <p className="mt-6 flex h-56 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
              <span>No earnings <AnnotatedText>in this period</AnnotatedText> yet.</span>
            </p>
          ) : (
            <div className="mt-6">
              <AreaChart
                data={period.rows}
                config={chartConfig}
                animate={!reduceMotion}
                margins={{ left: 44, bottom: 20, right: 8, top: 8 }}
                className="h-56 w-full"
              >
                <Grid />
                <YAxis tickCount={3} tickFormatter={(value) => axis.format(value / 100)} />
                <XAxis dataKey="label" maxTicks={12} />
                <Area dataKey="paid" variant="hatched" />
                <Area dataKey="earned" variant="dotted" />
                <Tooltip labelKey="label" valueFormatter={(value) => money(value, currency)} />
              </AreaChart>
              <BlockLegend config={chartConfig} className="mt-2" />
            </div>
          )}
          {/* Period totals read as one line under the chart. */}
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-border/70 pt-4">
            {summary.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className={cn('mt-0.5 font-mono text-sm tabular-nums', row.muted && 'text-muted-foreground')}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
