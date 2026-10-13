'use client';

/** Manages Stripe Connect onboarding and renders only the payout status confirmed by Bridge. */

import { useContext, useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Clock } from 'lucide-react';
import {
  StudioNotice,
  StudioSection,
  StudioStepsContext,
  studioFigureClassName,
  type LaunchStep,
} from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchCuratorPayoutAccount,
  startCuratorPayoutOnboarding,
  type CuratorPayoutAccount,
} from '@/services/curator';
import { removeQueryParameters } from '@/utils/remove-query-parameters';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type PayoutFlow = 'checking' | 'status' | 'return';

const checkedAtFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function needsAttention(account: CuratorPayoutAccount) {
  return account.onboardingStatus === 'restricted' || account.requirementsDue;
}

/** One line that names the state and the next step; the state word leads. */
function statusCopy(account: CuratorPayoutAccount | null) {
  if (!account) return 'Not started. Set up payouts before you publish a membership plan.';
  if (account.transfersCapabilityStatus === 'active') {
    return account.capabilityCheckedAtUtc
      ? `Ready. Last checked ${checkedAtFormatter.format(new Date(account.capabilityCheckedAtUtc))}.`
      : 'Ready. Earnings go out on your payout schedule.';
  }
  if (needsAttention(account)) return 'Needs attention. Stripe needs more information before you can publish a plan or receive payouts.';
  return 'Verifying. You can publish a plan and receive payouts once Stripe verifies your account.';
}

const ringRadius = 40;
const ringCircumference = 2 * Math.PI * ringRadius;

/** Payout readiness as a ring: setup started, account verified.
    Ring math after opensourceui.in's progress-ring (MIT); the arc draws in on
    mount and snaps under reduced motion. */
function ReadinessRing({ done, total }: { done: number; total: number }) {
  const gradientId = useId();
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const progress = drawn ? done / total : 0;
  return (
    <div className="relative mx-auto size-28 sm:mx-0">
      {/* An inline SVG is the drawing itself; role="img" names it for assistive technology. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <svg role="img" aria-label={`${done} of ${total} payout steps ready`} viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={ringRadius} fill="none" className="stroke-border/70" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={ringRadius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringCircumference - progress * ringCircumference}
          className="transition-[stroke-dashoffset] duration-700 ease-out-quart motion-reduce:transition-none"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
        </defs>
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-teko text-3xl font-bold leading-none tabular-nums">{done}/{total}</span>
        <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">ready</span>
      </div>
    </div>
  );
}

/** `nextStep` is the plan step a completed payout return offers; it lives on the Membership view. */
export function CuratorPayoutCard({ nextStep }: { nextStep?: LaunchStep }) {
  const views = useContext(StudioStepsContext);
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const returnHandled = useRef(false);
  const [flow, setFlow] = useState<PayoutFlow>('checking');
  // Landing from an expired hosted-onboarding link (?payout=refresh) shows a
  // renewal notice alongside the normal status view instead of a locked mode.
  const [linkExpired, setLinkExpired] = useState(false);
  const onboarding = useMutation({
    mutationFn: () => startCuratorPayoutOnboarding(),
    onSuccess: (result) => window.location.assign(result.onboardingUrl),
    onError: () => void queryClient.invalidateQueries({ queryKey: ['curator-profile', 'me'] }),
  });
  const status = useQuery({
    queryKey: ['curator-payout-account', flow === 'return' ? 'refresh' : 'current'],
    queryFn: ({ signal }) => fetchCuratorPayoutAccount(flow === 'return', signal),
    enabled: flow === 'status' || flow === 'return',
    staleTime: 0,
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const requestedFlow = new URL(window.location.href).searchParams.get('payout');
    if (requestedFlow === 'refresh') {
      setLinkExpired(true);
      removeQueryParameters('payout');
      setFlow('status');
      return;
    }
    setFlow(requestedFlow === 'return' ? 'return' : 'status');
  }, []);

  useEffect(() => {
    if (flow !== 'return' || !status.isSuccess || returnHandled.current) return;
    returnHandled.current = true;
    queryClient.setQueryData(['curator-payout-account', 'current'], status.data ?? null);
    removeQueryParameters('payout');
  }, [flow, queryClient, status.data, status.isSuccess]);

  const account = status.data ?? null;
  const loading = flow === 'checking' || status.isPending;
  const payoutsActive = account?.transfersCapabilityStatus === 'active';
  const returned = flow === 'return' && !loading && !status.isError;
  // Onboarding keeps the button disabled through isSuccess: the mutation resolves
  // before the Stripe navigation completes, so re-enabling would allow a double submit.
  const onboardingBusy = onboarding.isPending || onboarding.isSuccess;
  const actionLabel = linkExpired
    ? 'Open a new setup link'
    : account ? 'Continue payout setup' : 'Set up payouts';

  return (
    <StudioSection
      id="studio-payouts"
      title="Payout setup"
      headingId="curator-payout-title"
      testId="curator-payout-card"
      description={payoutsActive
        ? undefined
        : 'Free, and no business or website is needed. Stripe confirms your identity and connects your bank account. It asks for your Social Security number because Cassette sends you a 1099 tax form.'}
    >
      <StudioNotice
        testId="curator-payout-notice"
        tone={linkExpired ? 'warning' : payoutsActive ? 'success' : 'neutral'}
        className="mb-5"
        action={returned && payoutsActive && nextStep && (
          <Button size="sm" onClick={() => views?.open(nextStep.href.slice(1))}>
            {nextStep.label}
            <ArrowRight aria-hidden />
          </Button>
        )}
      >
        {returned
          ? payoutsActive
            ? 'Payout setup is complete.'
            : 'Payout setup started. Verification is still in progress; see the status below.'
          : linkExpired
            ? 'Your secure payout setup link expired. Open a new link to continue.'
            : null}
      </StudioNotice>
      {/* Once payouts are active, setup is one line: the state, the last check, and the update action. */}
      <div className={payoutsActive ? 'flex flex-wrap items-center justify-between gap-x-4 gap-y-3' : 'space-y-5'}>
        {loading ? (
          <output className="text-sm text-muted-foreground">Loading payout status…</output>
        ) : status.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {getUserFacingApiErrorMessage(status.error, 'Payout status is unavailable.')}
              {' '}Your other Cassette features still work.
            </p>
            <Button type="button" variant="outline" onClick={() => void status.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <p className="max-w-prose text-sm leading-relaxed">{statusCopy(account)}</p>

            {account && !payoutsActive && (
              /* Setup in progress: the ring counts the steps, and each figure is the parent of its label and state. */
              <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <ReadinessRing done={1} total={2} />
              <dl className="grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className={studioFigureClassName}>
                  <dt className="text-xs text-muted-foreground">Setup started</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-success-text">
                    <Check aria-hidden className="size-4" />
                    Done
                  </dd>
                </div>
                <div className={studioFigureClassName}>
                  <dt className="text-xs text-muted-foreground">Publish and receive payouts</dt>
                  <dd className={cn(
                    'mt-1 flex items-center gap-1.5 text-sm font-semibold',
                    needsAttention(account) ? 'text-warning-text' : 'text-foreground',
                  )}>
                    <Clock aria-hidden className="size-4" />
                    {needsAttention(account) ? 'Needs your information' : 'Waiting for verification'}
                  </dd>
                </div>
                <div className={studioFigureClassName}>
                  <dt className="text-xs text-muted-foreground">Last checked</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums">
                    {account.capabilityCheckedAtUtc
                      ? checkedAtFormatter.format(new Date(account.capabilityCheckedAtUtc))
                      : 'Not yet'}
                  </dd>
                </div>
              </dl>
              </div>
            )}

            {onboarding.isError && (
              <p role="alert" className="basis-full text-sm text-destructive">
                {getUserFacingApiErrorMessage(onboarding.error, 'We could not open secure payout setup.')}
                {' '}Try again.
              </p>
            )}

            <Button
              type="button"
              variant={payoutsActive ? 'outline' : 'default'}
              data-testid="curator-payout-onboarding"
              className="w-full sm:w-auto"
              disabled={onboardingBusy}
              onClick={() => onboarding.mutate()}
            >
              {onboardingBusy ? 'Opening…' : payoutsActive ? 'Update payout details' : actionLabel}
            </Button>
          </>
        )}
      </div>
    </StudioSection>
  );
}
