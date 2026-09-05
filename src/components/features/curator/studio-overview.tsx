'use client';

/** Curator Studio landing view: the launch checklist while setup is incomplete,
    and once Curator Pro is active, at-a-glance numbers, a dithered earnings
    trend, and the latest ledger activity. */

import { useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Sparkline } from '@/components/dither-kit/sparkline';
import { HistoryItem } from '@/components/features/curator/curator-earnings-card';
import { StudioStepsContext } from '@/components/features/curator/studio-shell';
import { TaskSteps } from '@/components/interior/task-steps';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuthState } from '@/hooks/use-auth';
import type { CuratorPayoutAccount, CuratorProfile } from '@/services/curator';
import { fetchCuratorEarnings, type CuratorEarnings } from '@/services/curator-earnings';
import type { CuratorPlan } from '@/services/curator-plans';
import type { CuratorProStatus } from '@/services/curator-pro';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

export type LaunchStep = { href: string; label: string; done: boolean };

const countFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const money = (amountMinor: number, currency: string) =>
  formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');

const trendMonths = 6;
/** The API's largest page, so one request covers as much history as possible. */
const overviewPageSize = 50;

/** Buckets earned allocations by calendar month for the last `trendMonths` months. */
function monthlyEarnings(earnings: CuratorEarnings) {
  const now = new Date();
  const keys = Array.from({ length: trendMonths }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (trendMonths - 1 - i), 1));
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: monthFormatter.format(d) };
  });
  const totals = new Map(keys.map(({ key }) => [key, 0]));
  let currency = 'USD';
  for (const item of earnings.items) {
    if (item.kind !== 'allocation') continue;
    if (item.status === 'forfeited' || item.status === 'reversed') continue;
    const d = new Date(item.occurredAtUtc);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!totals.has(key)) continue;
    totals.set(key, (totals.get(key) ?? 0) + item.amountMinor);
    currency = item.currency;
  }
  const values = keys.map(({ key }) => totals.get(key) ?? 0);
  return { values, labels: keys.map((k) => k.label), total: values.reduce((a, b) => a + b, 0), currency };
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card elev-soft">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

function StatTile({ label, value, hint, onClick }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-teko text-3xl font-bold leading-none tabular-nums">{value}</dd>
      {hint && <dd className="mt-1.5 text-xs text-muted-foreground">{hint}</dd>}
    </>
  );
  return (
    <div className="min-w-0 flex-1 basis-40">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="block w-full rounded-lg px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </button>
      ) : (
        <div className="px-4 py-3.5">{body}</div>
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
    <Card title="What Curator Pro unlocks">
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
  );
}

function payoutSummary(account: CuratorPayoutAccount | null | undefined) {
  if (account === undefined) return { value: '—', hint: 'Checking…' };
  if (account === null) return { value: 'Not started', hint: 'Needed before fans can join' };
  if (account.transfersCapabilityStatus === 'active') return { value: 'Ready', hint: 'Earnings pay out on schedule' };
  if (account.onboardingStatus === 'restricted' || account.requirementsDue) {
    return { value: 'Needs attention', hint: 'More information required' };
  }
  return { value: 'Verifying', hint: 'Fans can join meanwhile' };
}

function proSummary(pro: CuratorProStatus | undefined) {
  if (!pro) return { value: '—', hint: 'Checking…' };
  if (pro.cancelAtPeriodEnd) {
    return {
      value: 'Canceling',
      hint: pro.paidThroughUtc ? `Ends ${dateFormatter.format(new Date(pro.paidThroughUtc))}` : 'Ends after this period',
    };
  }
  if (pro.hasAccess) {
    return {
      value: 'Active',
      hint: pro.discountKind === 'none'
        ? `${money(pro.monthlyPriceMinor, pro.currency)} per month`
        : 'Discounted',
    };
  }
  return { value: 'Inactive', hint: 'Needed to publish a plan' };
}

export function StudioOverview({
  profile,
  steps,
  doneCount,
  nextIndex,
  pro,
  payout,
  plans,
}: {
  profile: CuratorProfile | null;
  steps: LaunchStep[];
  doneCount: number;
  nextIndex: number;
  pro: CuratorProStatus | undefined;
  payout: CuratorPayoutAccount | null | undefined;
  plans: CuratorPlan[] | undefined;
}) {
  const { user } = useAuthState();
  const views = useContext(StudioStepsContext);
  const proActive = pro?.hasAccess === true;
  const earnings = useQuery({
    queryKey: ['curator-earnings', user?.id ?? null, 1, overviewPageSize],
    queryFn: ({ signal }) => fetchCuratorEarnings(1, overviewPageSize, signal),
    enabled: Boolean(user?.id) && proActive && profile !== null,
    staleTime: 0,
  });
  const trend = useMemo(() => earnings.data ? monthlyEarnings(earnings.data) : null, [earnings.data]);
  const activePlan = plans?.find((plan) => plan.status === 'active') ?? null;
  const payoutState = payoutSummary(payout);
  const proState = proSummary(pro);
  const setupIncomplete = nextIndex !== -1;
  // One orchestrated entrance for the dashboard; disabled under prefers-reduced-motion.
  const reduceMotion = useReducedMotion();
  const rise = (order: number) => reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay: 0.07 * order, ease: [0.22, 1, 0.36, 1] as const },
      };

  // Starting Curator Pro is itself a launch step, so a free curator is always mid-setup.
  if (!proActive) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <LaunchCard steps={steps} doneCount={doneCount} nextIndex={nextIndex} />
        <ProUpsellCard pro={pro} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {setupIncomplete && <LaunchCard steps={steps} doneCount={doneCount} nextIndex={nextIndex} />}

      <motion.dl {...rise(0)} className="flex flex-wrap divide-y divide-border rounded-xl border border-border bg-card elev-soft sm:divide-x sm:divide-y-0">
        <StatTile
          label="Active members"
          value={earnings.data ? countFormatter.format(earnings.data.activeMemberCount) : '—'}
          hint={earnings.isError ? 'Unavailable right now' : 'Paying members today'}
          onClick={() => views?.open('studio-earnings')}
        />
        <StatTile
          label="Live plan"
          value={plans === undefined
            ? '—'
            : activePlan
              ? `${money(activePlan.amountMinor, activePlan.currency)}/mo`
              : 'None yet'}
          hint={activePlan ? activePlan.name : 'Publish a plan so fans can join'}
          onClick={() => views?.open('studio-plan')}
        />
        <StatTile
          label="Payouts"
          value={payoutState.value}
          hint={payoutState.hint}
          onClick={() => views?.open('studio-payouts')}
        />
        <StatTile
          label="Curator Pro"
          value={proState.value}
          hint={proState.hint}
          onClick={() => views?.open('studio-pro')}
        />
      </motion.dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...rise(1)}>
        <Card
          title="Recent earnings"
          action={<span className="text-xs text-muted-foreground">Last {trendMonths} months</span>}
        >
          {earnings.isPending ? (
            <output className="text-sm text-muted-foreground">Loading earnings…</output>
          ) : trend ? (
            <>
              <p className="font-teko text-4xl font-bold leading-none tabular-nums">
                {money(trend.total, trend.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Earned from members, from your latest {earnings.data?.items.length ?? 0} ledger events.
              </p>
              <div className="mt-4 h-24" aria-hidden>
                <Sparkline
                  data={trend.values}
                  color={trend.total > 0 ? 'brand' : 'grey'}
                  variant="dotted"
                  animate
                  className="h-full w-full"
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground" aria-hidden>
                {trend.labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Earnings are unavailable right now.</p>
          )}
        </Card>
        </motion.div>

        <motion.div {...rise(2)}>
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
          ) : earnings.data && earnings.data.items.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {earnings.data.items.slice(0, 4).map((item, index) => (
                <HistoryItem key={`${item.kind}-${item.occurredAtUtc}-${index}`} item={item} compact />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Activity shows up here as fans join your plan.
            </p>
          )}
        </Card>
        </motion.div>
      </div>
    </div>
  );
}
