'use client';

/** Curator Studio landing view. Once Curator Pro is active: stat cards, a
    dithered earned-versus-paid chart with a running activity feed beside it,
    and the membership plan card. Before that: the launch checklist, the Pro
    upsell, and the plan editor. */

import { useContext, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CuratorPlanCard } from '@/components/features/curator/curator-plan-card';
import { Area } from '@/components/dither-kit/area';
import { AreaChart } from '@/components/dither-kit/area-chart';
import { BlockLegend } from '@/components/dither-kit/block-legend';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { YAxis } from '@/components/dither-kit/y-axis';
import { eventTitle } from '@/components/features/curator/curator-earnings-card';
import { StudioStepsContext } from '@/components/features/curator/studio-shell';
import { useCuratorLedger } from '@/components/features/curator/use-curator-ledger';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { TaskSteps } from '@/components/interior/task-steps';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { CuratorProfile } from '@/services/curator';
import { monthStart, periodSummary, type CuratorEarningsBalances } from '@/services/curator-earnings';
import type { CuratorProStatus } from '@/services/curator-pro';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { AnnotatedText } from '@/components/ui/annotated-text';
import { cn } from '@/lib/utils';

export type LaunchStep = { href: string; label: string; done: boolean };

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

function Card({ title, action, className, children }: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('card-quiet', className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

/** One stat card. Clickable tiles open the view that explains the number. */
function StatTile({ label, value, hint, onClick }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 font-teko text-4xl font-bold leading-none tabular-nums">{value}</dd>
      {hint && <dd className="mt-2 text-xs text-muted-foreground">{hint}</dd>}
    </>
  );
  const shell = 'block h-full w-full card-quiet px-5 py-4 text-left';
  return (
    <div className="min-w-0">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(shell, 'transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
        >
          {body}
        </button>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </div>
  );
}

function LaunchCard({ steps, doneCount, nextIndex }: { steps: LaunchStep[]; doneCount: number; nextIndex: number }) {
  const views = useContext(StudioStepsContext);
  const next = steps[nextIndex];
  return (
    <Card
      title="Launch checklist"
      action={<span className="text-xs tabular-nums text-muted-foreground">{doneCount} of {steps.length} done</span>}
    >
      <Progress
        value={(doneCount / steps.length) * 100}
        aria-label={`Launch progress: ${doneCount} of ${steps.length} steps complete`}
        className="h-1.5"
      />
      <TaskSteps
        className="mt-4"
        label="Launch checklist"
        steps={steps.map((step, index) => ({ id: String(index), label: step.label, done: step.done }))}
        onSelect={(id) => views?.open(steps[Number(id)].href.slice(1))}
      />
      {next && (
        <Button className="mt-4 w-full sm:w-auto" onClick={() => views?.open(next.href.slice(1))}>
          Next: {next.label}
          <ArrowRight aria-hidden />
        </Button>
      )}
    </Card>
  );
}

function ProUpsellCard({ pro }: { pro: CuratorProStatus | undefined }) {
  const views = useContext(StudioStepsContext);
  const unlocks = [
    'Publish a membership plan fans can join',
    'Lock posts so only members can open them',
    'Get membership earnings paid out on schedule',
  ];
  return (
    // Stacked deck: two tilted panes fan out behind the card and spread on hover.
    <div className="group relative">
      <div aria-hidden className="absolute inset-x-4 bottom-0 top-6 -rotate-2 rounded-xl bg-muted transition-transform duration-500 group-hover:-rotate-3 motion-reduce:transition-none" />
      <div aria-hidden className="absolute inset-x-2 bottom-0 top-3 rotate-1 rounded-xl border border-border bg-muted/70 transition-transform duration-500 group-hover:rotate-2 motion-reduce:transition-none" />
    <Card title="What Curator Pro unlocks" className="relative bg-card transition-transform duration-500 group-hover:-translate-y-0.5 motion-reduce:transition-none">
      <ul className="space-y-2.5 text-sm">
        {unlocks.map((line) => (
          <li key={line} className="flex gap-2.5">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        {pro
          ? `${money(pro.monthlyPriceMinor, pro.currency)} per month. Your free profile and regular Cassette features stay free.`
          : 'Your free profile and regular Cassette features stay free.'}
      </p>
      <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={() => views?.open('studio-pro')}>
        See Curator Pro
      </Button>
    </Card>
    </div>
  );
}

export function StudioOverview({
  profile,
  steps,
  doneCount,
  nextIndex,
  pro,
}: {
  profile: CuratorProfile | null;
  steps: LaunchStep[];
  doneCount: number;
  nextIndex: number;
  pro: CuratorProStatus | undefined;
}) {
  const views = useContext(StudioStepsContext);
  const proActive = pro?.hasAccess === true;
  const earnings = useCuratorLedger(proActive && profile !== null);
  const ledger = earnings.data;
  const [months, setMonths] = useState('6');
  const period = useMemo(
    () => ledger ? periodSummary(ledger.items, ledger.totalItems, Number(months)) : null,
    [ledger, months],
  );
  const balances = ledger?.balances;
  const currency = balances?.currency ?? 'USD';
  const axis = useMemo(() => axisMoney(currency), [currency]);
  const setupIncomplete = nextIndex !== -1;
  // The ledger is read newest-first up to a page cap; say so when the window is cut short.
  const windowHint = ledger && !ledger.coversWindow
    ? `From your latest ${countFormatter.format(ledger.items.length)} ledger events`
    : null;
  const tiles = ledger && balances
    ? [
        {
          label: 'Earned this month',
          value: money(balances.earnedThisMonth, currency),
          hint: `Since ${dayFormatter.format(monthStart(0))}`,
          target: 'studio-earnings',
        },
        {
          label: 'Payable balance',
          value: money(balances.payable, currency),
          hint: balances.accrued > 0
            ? `${money(balances.accrued, currency)} more still accruing`
            : 'Cleared and waiting to be sent',
          target: 'studio-payouts',
        },
        { label: 'Next payout', target: 'studio-payouts', ...nextPayout(balances) },
        {
          label: 'Active members',
          value: countFormatter.format(ledger.activeMemberCount),
          hint: 'Paying members today',
          target: 'studio-earnings',
        },
      ]
    : ['Earned this month', 'Payable balance', 'Next payout', 'Active members'].map((label) => ({
        label,
        value: '—',
        hint: earnings.isError ? 'Unavailable right now' : 'Loading…',
        target: 'studio-earnings',
      }));
  // One orchestrated entrance for the dashboard; disabled under prefers-reduced-motion.
  const reduceMotion = useReducedMotion();
  const rise = (order: number) => reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay: 0.07 * order, ease: [0.22, 1, 0.36, 1] as const },
      };

  const suspended = profile?.suspensionReason && (
    <Alert variant="destructive">
      <AlertDescription>This curator profile is suspended: {profile.suspensionReason}</AlertDescription>
    </Alert>
  );

  // Starting Curator Pro is itself a launch step, so a free curator is always mid-setup.
  if (!proActive) {
    return (
      <div className="space-y-6">
        {suspended}
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2">
            <LaunchCard steps={steps} doneCount={doneCount} nextIndex={nextIndex} />
          </div>
          <ProUpsellCard pro={pro} />
        </div>
        <CuratorPlanCard profile={profile} />
      </div>
    );
  }

  const summary = period
    ? [
        { label: 'Earned', value: money(period.earned, currency) },
        { label: 'Pending payout', value: money(period.pending, currency) },
        { label: 'Paid out', value: money(period.paid, currency) },
        { label: 'Forfeited', value: money(period.forfeited, currency), muted: true },
      ]
    : [];

  return (
    <div className="space-y-6">
      {suspended}

      <motion.dl {...rise(0)} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} onClick={() => views?.open(tile.target)} />
        ))}
      </motion.dl>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <motion.div {...rise(1)} className="lg:col-span-2">
          <Card
            title="Earnings"
            action={
              <SegmentedControl
                label="Earnings period"
                options={periods}
                value={months}
                onValueChange={setMonths}
              />
            }
          >
            {earnings.isPending ? (
              <output className="text-sm text-muted-foreground">Loading earnings…</output>
            ) : period ? (
              <div>
                <p className="font-teko text-4xl font-bold leading-none tabular-nums">
                  {money(period.earned, currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Earned from members in the last {months} months
                  {period.complete ? '.' : `. ${windowHint}.`}
                </p>
                {period.earned + period.paid === 0 ? (
                  <p className="mt-4 flex h-56 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
                    <span>No earnings <AnnotatedText>in this period</AnnotatedText> yet.</span>
                  </p>
                ) : (
                  <div className="mt-4">
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
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/70 pt-4 sm:grid-cols-4">
                  {summary.map((row) => (
                    <div key={row.label}>
                      <dt className="text-xs text-muted-foreground">{row.label}</dt>
                      <dd className={cn('mt-0.5 font-mono text-sm tabular-nums', row.muted && 'text-muted-foreground')}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Earnings are unavailable right now. Try again in a moment.</p>
            )}
          </Card>
        </motion.div>

        <motion.div {...rise(2)} className="space-y-6">
          {setupIncomplete && <LaunchCard steps={steps} doneCount={doneCount} nextIndex={nextIndex} />}
          <Card
            title="Latest activity"
            action={
              <button
                type="button"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => views?.open('studio-earnings')}
              >
                View all
              </button>
            }
          >
            {earnings.isPending ? (
              <output className="text-sm text-muted-foreground">Loading activity…</output>
            ) : ledger && ledger.items.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {ledger.items.slice(0, 8).map((item, index) => (
                  <li key={`${item.kind}-${item.occurredAtUtc}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{eventTitle(item)}</p>
                      <time dateTime={item.occurredAtUtc} className="text-xs text-muted-foreground">
                        {dayFormatter.format(new Date(item.occurredAtUtc))}
                      </time>
                    </div>
                    <p className="shrink-0 font-mono text-sm tabular-nums">{money(item.amountMinor, item.currency)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Activity shows up here <AnnotatedText variant="highlight" className="text-accent">as fans join your plan</AnnotatedText>.
              </p>
            )}
          </Card>
        </motion.div>
      </div>

      <CuratorPlanCard profile={profile} />
    </div>
  );
}
