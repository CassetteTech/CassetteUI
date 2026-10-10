'use client';

/** Curator Studio landing view. Once a plan has been published: one hero
    figure (earned in the chosen period) with two payout figures under it, a
    dithered earned-versus-paid chart at full width, and the latest activity.
    Before that: the launch checklist. Every curator then sees the current
    audience and the membership plan card. */

import { useContext, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
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
import { StudioStat, StudioStepsContext, studioFigureClassName, studioViewOf } from '@/components/features/curator/studio-shell';
import { useCuratorLedger } from '@/components/features/curator/use-curator-ledger';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { TaskSteps } from '@/components/interior/task-steps';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from '@/hooks/use-auth';
import { fetchCuratorAudience, type CuratorProfile } from '@/services/curator';
import { periodSummary, type CuratorEarningsBalances } from '@/services/curator-earnings';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { AnnotatedText } from '@/components/ui/annotated-text';
import { cn } from '@/lib/utils';

/** `notice` is the one sentence the overview shows when the step is open again after launch. */
export type LaunchStep = { href: string; label: string; notice: string; done: boolean };

/** A forward arrow only for a step on another view; an overview step scrolls in place. */
const stepArrow = (step: LaunchStep) =>
  studioViewOf(step.href.slice(1)) !== 'studio-overview' && <ArrowRight aria-hidden />;

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

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card-quiet">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
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
      {doneCount === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">A membership lets fans support your curation with a monthly payment.</p>
      )}
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
          {stepArrow(next)}
        </Button>
      )}
    </Card>
  );
}

/** The owner's current audience from its own read, never the earnings ledger's status count. Members
    are part of the audience; neither figure is shown to anyone else. */
function AudienceCard({ onOpenMembers }: { onOpenMembers: () => void }) {
  const { user } = useAuthState();
  const audience = useQuery({
    queryKey: ['curator-audience', user?.id ?? null],
    queryFn: ({ signal }) => fetchCuratorAudience(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const figure = (count: number | undefined, hint: string) => ({
    value: count === undefined ? '—' : countFormatter.format(count),
    hint: count !== undefined ? hint : audience.isError ? 'Unavailable right now' : 'Loading…',
  });
  return (
    <section aria-label="Audience" className="card-quiet px-5 py-5 sm:px-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <StudioStat label="Audience" {...figure(audience.data?.audienceCount, 'Followers and members')} />
        <StudioStat
          label="Members"
          {...figure(audience.data?.activeMemberCount, 'With access today')}
          onClick={onOpenMembers}
        />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Your audience counts each person once: everyone who follows you, plus your active members. Only you see
        these numbers.
      </p>
      {audience.isError && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void audience.refetch()}>
          Try again
        </Button>
      )}
    </section>
  );
}

/** Mirrors the earnings overview layout so the page does not reflow when data lands. */
export function OverviewSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="card-quiet px-5 py-5 sm:px-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-11 w-40" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={studioFigureClassName}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-56 w-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function StudioOverview({
  profile,
  steps,
  doneCount,
  nextIndex,
  hasPublished,
  stepsKnown,
}: {
  profile: CuratorProfile | null;
  steps: LaunchStep[];
  doneCount: number;
  nextIndex: number;
  /** null while the first plan read is in flight. */
  hasPublished: boolean | null;
  /** False until every step's state has been read. */
  stepsKnown: boolean;
}) {
  const views = useContext(StudioStepsContext);
  const earnings = useCuratorLedger(hasPublished === true && profile !== null);
  const ledger = earnings.data;
  const [months, setMonths] = useState('6');
  const period = useMemo(
    () => ledger ? periodSummary(ledger.items, ledger.totalItems, Number(months)) : null,
    [ledger, months],
  );
  const balances = ledger?.balances;
  const currency = balances?.currency ?? 'USD';
  const axis = useMemo(() => axisMoney(currency), [currency]);
  // After launch an open setup step is one banner, not the checklist; an unread step is not open.
  const openStep = stepsKnown ? steps[nextIndex] : undefined;
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

  // Earned is the hero figure, so the totals line holds the period's other outcomes.
  const summary = period
    ? [
        { label: 'Paid out', value: money(period.paid, currency) },
        { label: 'Not earned', value: money(period.forfeited, currency), muted: true },
      ]
    : [];

  // The plan card keeps its position in both layouts so publishing does not remount it.
  return (
    <div className="space-y-6">
      {suspended}

      {/* Nothing has been earned before the first publish, so setup leads. While the
          plan read is still in flight the skeleton holds, so the dashboard reveals once.
          The plan card below stays mounted throughout so its own reads start now. */}
      {hasPublished === null ? (
        <OverviewSkeleton />
      ) : !hasPublished ? (
        <motion.div {...rise(0)}>
          <LaunchCard steps={steps} doneCount={doneCount} nextIndex={nextIndex} />
        </motion.div>
      ) : (
      <>
        {openStep && (
          <motion.div {...rise(0)}>
            <Alert className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted/40">
              <p>{openStep.notice}</p>
              <Button size="sm" onClick={() => views?.open(openStep.href.slice(1))}>
                {openStep.label}
                {stepArrow(openStep)}
              </Button>
            </Alert>
          </motion.div>
        )}

        {/* Stripe Express shape: the hero figure and its period control, three figures, then the chart at full width. */}
        <motion.section {...rise(1)} aria-labelledby="studio-earned-title" className="card-quiet px-5 py-5 sm:px-6">
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
        </motion.section>

        <motion.div {...rise(2)}>
          <Card
            title="Latest activity"
            action={
              <Button variant="link" size="xs" className="-mr-2" onClick={() => views?.open('studio-earnings')}>
                View all
              </Button>
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
      </>
      )}

      {/* A free curator without a plan has an audience too, so it does not wait for the plan read. */}
      {profile && (
        <motion.div {...rise(hasPublished ? 3 : 1)}>
          <AudienceCard onOpenMembers={() => views?.open('studio-earnings')} />
        </motion.div>
      )}

      <motion.div {...rise(hasPublished ? 4 : 2)}>
        <CuratorPlanCard profile={profile} />
      </motion.div>
    </div>
  );
}
