'use client';

/** Curator Studio landing view, the same structure for every account. Music comes first: the
    recent posts with their row tools. One next step at a time sits above them: membership setup
    that is under way, or, after the first publish, an open setup step, the members-only post
    nudge, or sharing the page. A published curator also sees the earnings hero and the dithered
    earned-versus-paid chart. A curator with no plan gets one invitation to set one up, under the
    music. The rail, under the pass, holds the audience and, after a publish, the latest activity.
    The plan itself lives on the Membership view. */

import { useContext, useId, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Area } from '@/components/dither-kit/area';
import { AreaChart } from '@/components/dither-kit/area-chart';
import { BlockLegend } from '@/components/dither-kit/block-legend';
import type { ChartConfig } from '@/components/dither-kit/chart-context';
import { Grid } from '@/components/dither-kit/grid';
import { Tooltip } from '@/components/dither-kit/tooltip';
import { XAxis } from '@/components/dither-kit/x-axis';
import { YAxis } from '@/components/dither-kit/y-axis';
import { eventTitle } from '@/components/features/curator/curator-earnings-card';
import { StudioRecentMusic } from '@/components/features/curator/studio-recent-music';
import { addMusicHref, studioMusicHref, studioPaths } from '@/components/features/curator/studio-routes';
import {
  StepButton,
  StudioStat,
  StudioStepsContext,
  studioFigureClassName,
  type LaunchStep,
} from '@/components/features/curator/studio-shell';
import { useCuratorLedger, type CuratorLedger } from '@/components/features/curator/use-curator-ledger';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from '@/hooks/use-auth';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { fetchCuratorAudience, type CuratorProfile } from '@/services/curator';
import { periodSummary, type CuratorEarningsBalances } from '@/services/curator-earnings';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { profileService } from '@/services/profile';
import { AnnotatedText } from '@/components/ui/annotated-text';
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

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="card-quiet">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 id={headingId} className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="px-4 pb-3 pt-2">{children}</div>
    </section>
  );
}

const latestActivityCount = 5;

/** The newest ledger events as statement lines, the same reading as the full statement on Membership. */
function LatestActivity({ ledger, pending, onViewAll }: {
  ledger: CuratorLedger | undefined;
  pending: boolean;
  onViewAll: () => void;
}) {
  let body: ReactNode;
  if (pending) {
    body = <output className="block py-1 text-sm text-muted-foreground">Loading activity…</output>;
  } else if (!ledger) {
    // A failed read is not an empty ledger, so it never says that nothing happened.
    body = <p className="py-1 text-sm text-muted-foreground">Activity is unavailable right now.</p>;
  } else if (ledger.items.length === 0) {
    body = (
      <p className="py-1 text-sm text-muted-foreground">
        Activity shows up here <AnnotatedText variant="highlight" className="text-accent">as fans join your plan</AnnotatedText>.
      </p>
    );
  } else {
    body = (
      <ul className="divide-y divide-border/70">
        {ledger.items.slice(0, latestActivityCount).map((item, index) => (
          <li
            key={`${item.kind}-${item.occurredAtUtc}-${index}`}
            className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5"
          >
            <time dateTime={item.occurredAtUtc} className="font-mono text-xs uppercase tabular-nums text-muted-foreground">
              {dayFormatter.format(new Date(item.occurredAtUtc))}
            </time>
            <p className="truncate text-sm">{eventTitle(item)}</p>
            <p className="font-mono text-sm tabular-nums">{money(item.amountMinor, item.currency)}</p>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Card
      title="Latest activity"
      action={<Button variant="link" size="xs" className="-mr-2" onClick={onViewAll}>View all</Button>}
    >
      {body}
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
    <section aria-label="Audience" className="card-quiet p-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <StudioStat label="Audience" {...figure(audience.data?.audienceCount, 'Followers and members')} />
        <StudioStat
          label="Members"
          {...figure(audience.data?.activeMemberCount, 'With access today')}
          onClick={onOpenMembers}
        />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Each person counts once. Only you see these numbers.
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

const membersPostNudgeDays = 14;
const dayMs = 24 * 60 * 60 * 1000;

/** Days since the newest members-only post once they reach `membersPostNudgeDays`, 'never' when
    there is none, else null. Read only for a curator who can post members-only. */
function useMembersPostGap(enabled: boolean) {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  // Newest first, so one item is the latest members-only post. Under the activity key, so a new
  // post anywhere refreshes it.
  const latest = useQuery({
    queryKey: ['user-activity', userId, 'studio-members-latest'],
    queryFn: () => profileService.fetchUserActivity(userId!, { pageSize: 1, privacy: 'subscriber' }),
    enabled: enabled && userId !== null,
    staleTime: 0,
  });
  if (!enabled || !latest.data) return null;
  const newest = latest.data.items[0];
  if (!newest) return 'never' as const;
  const days = Math.floor((Date.now() - Date.parse(newest.createdAt)) / dayMs);
  return days >= membersPostNudgeDays ? days : null;
}

/** An open step as one banner: its notice and the button that starts it. */
function StepBanner({ step }: { step: LaunchStep }) {
  return (
    <Alert className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted/40">
      <p>{step.notice}</p>
      <StepButton step={step} view="studio-overview" size="sm">
        {step.label}
      </StepButton>
    </Alert>
  );
}

/** Members pay for the posts only they can open, so a long gap since the last one gets a banner. */
function MembersPostNudge({ gap }: { gap: number | 'never' }) {
  return (
    <Alert className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted/40">
      <p>
        {gap === 'never' ? 'You have no members-only posts yet.' : `No new members-only post in ${gap} days.`}
        {' '}Members join for the posts only they can open.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={addMusicHref(studioPaths['studio-overview'])}>Add music</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={studioMusicHref({ audience: 'public' })}>Choose a public post</Link>
        </Button>
      </div>
    </Alert>
  );
}

/** One next step as a quiet card: what it is, one line on why, and its button. */
function NextStepCard({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="card-quiet flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-6"
    >
      <div className="min-w-0">
        <h2 id={headingId} className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
      {action}
    </section>
  );
}

export function StudioOverview({
  active,
  railSlot,
  profile,
  hasPublished,
  plansKnown,
  stepsKnown,
  setupSteps,
  setupStarted,
  musicStep,
  shareStep,
}: {
  /** Whether the Overview is showing. Its music rows render only then, so a hidden copy never
      doubles the rows of Studio Music. */
  active: boolean;
  /** The Overview's part of the page rail, under the pass. The layout hides it on other views. */
  railSlot: HTMLElement | null;
  profile: CuratorProfile | null;
  /** null while the first plan read is in flight; false also after that read failed. */
  hasPublished: boolean | null;
  /** False while the plan read has no answer (pending, or failed with nothing cached). */
  plansKnown: boolean;
  /** False until every step's state has been read. */
  stepsKnown: boolean;
  /** Design your membership, Set up payouts, Publish your plan. */
  setupSteps: LaunchStep[];
  /** A plan draft or a payout account exists. */
  setupStarted: boolean;
  /** Null while the first music read has failed. */
  musicStep: LaunchStep | null;
  shareStep: LaunchStep;
}) {
  const views = useContext(StudioStepsContext);
  const access = useMemberPostAccess();
  const earnings = useCuratorLedger(hasPublished === true && profile !== null);
  const ledger = earnings.data;
  // The rail rises in with the pass the first time it shows; a return to the Overview shows it at once.
  const [railEntered, setRailEntered] = useState(false);
  const [months, setMonths] = useState('6');
  const period = useMemo(
    () => ledger ? periodSummary(ledger.items, ledger.totalItems, Number(months)) : null,
    [ledger, months],
  );
  const balances = ledger?.balances;
  const currency = balances?.currency ?? 'USD';
  const axis = useMemo(() => axisMoney(currency), [currency]);
  // After launch, one banner: an open setup or music step, then the members-only post nudge, then
  // sharing. A step whose state is still unread is not open.
  const openStep = stepsKnown
    ? [...setupSteps, ...(musicStep ? [musicStep] : [])].find((step) => !step.done)
    : undefined;
  const membersGap = useMembersPostGap(hasPublished === true && access.state === 'ready');
  const banner = openStep
    ? <StepBanner step={openStep} />
    : membersGap !== null
      ? <MembersPostNudge gap={membersGap} />
      : stepsKnown && !shareStep.done && <StepBanner step={shareStep} />;
  // Before launch, setup under way leads; with nothing started, one invitation follows the music.
  const setupNext = setupSteps.find((step) => !step.done);
  const setupDone = setupSteps.filter((step) => step.done).length;
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

  return (
    <div className="space-y-6">
      {suspended}

      {/* Earnings exist only after the first publish. While the plan read is in flight the
          skeleton holds, so the dashboard reveals once. */}
      {hasPublished === null ? (
        <OverviewSkeleton />
      ) : hasPublished ? (
      <>
        {banner && <motion.div {...rise(0)}>{banner}</motion.div>}

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
      </>
      ) : setupStarted && stepsKnown && setupNext && (
        <motion.div {...rise(0)}>
          <NextStepCard
            title="Finish your membership"
            action={(
              <StepButton step={setupNext} view="studio-overview" size="sm">
                {setupNext.label}
              </StepButton>
            )}
          >
            {`${setupDone} of ${setupSteps.length} steps done.`}
          </NextStepCard>
        </motion.div>
      )}

      {/* The wrapper stays, so returning to the Overview shows the music without a second entrance. */}
      <motion.div {...rise(2)}>
        {active && <StudioRecentMusic />}
      </motion.div>

      {/* Music first: the invitation waits until the page has some, and until every setup answer is in. */}
      {stepsKnown && hasPublished === false && !setupStarted && musicStep?.done && (
        <motion.div {...rise(3)}>
          <NextStepCard
            title="Earn from your music"
            action={(
              <Button variant="outline" size="sm" onClick={() => views?.open('studio-plan')}>
                Set up a membership
                <ArrowRight aria-hidden />
              </Button>
            )}
          >
            A membership lets fans support your curation with a monthly payment.
          </NextStepCard>
        </motion.div>
      )}

      {/* Under the pass in the rail: who the page reaches, then, after a publish, what happened
          lately. A curator without a plan has an audience too, so it does not wait for the plan
          read. Member figures exist only after a publish; before it, Members opens the setup
          steps, and while the plan read has no answer, the plan card that explains it. */}
      {railSlot && profile && createPortal(
        <div
          className={cn(
            'flex flex-col gap-6',
            !railEntered && 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2.5 motion-safe:duration-450 motion-safe:ease-out-quart',
          )}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setRailEntered(true);
          }}
        >
          <AudienceCard
            onOpenMembers={() => views?.open(
              hasPublished ? 'studio-members' : plansKnown ? 'studio-setup' : 'studio-plan',
            )}
          />
          {hasPublished && (
            <LatestActivity
              ledger={ledger}
              pending={earnings.isPending}
              onViewAll={() => views?.open('studio-members')}
            />
          )}
        </div>,
        railSlot,
      )}
    </div>
  );
}
