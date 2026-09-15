'use client';

/** Manages Stripe Connect onboarding and renders only the payout status confirmed by Bridge. */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReceiptRow,
  StudioChip,
  StudioNotice,
  StudioSection,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
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

function payoutLabel(account: CuratorPayoutAccount | null) {
  if (!account) return 'Not started';
  if (account.transfersCapabilityStatus === 'active') return 'Ready';
  if (needsAttention(account)) return 'Needs attention';
  return 'Verifying';
}

function payoutTone(account: CuratorPayoutAccount | null): StudioChipTone {
  if (!account) return 'neutral';
  if (account.transfersCapabilityStatus === 'active') return 'positive';
  if (needsAttention(account)) return 'warning';
  return 'neutral';
}

/** Plain-language status plus what the curator should do next. */
function statusCopy(account: CuratorPayoutAccount | null) {
  if (!account) {
    return 'Start payout setup to accept paying members. Starting it is enough to publish a plan; payouts begin once your account is fully verified.';
  }
  if (account.transfersCapabilityStatus === 'active') {
    return 'Your payout account is verified. Members can join and earnings are paid out on your payout schedule.';
  }
  if (needsAttention(account)) {
    return 'Your payout account needs more information before earnings can be paid out. Members can still join; continue setup to provide what is missing.';
  }
  return 'Your payout account is being verified. Members can join in the meantime; earnings are held until verification completes.';
}

export function CuratorPayoutCard() {
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
  // Onboarding keeps the button disabled through isSuccess: the mutation resolves
  // before the Stripe navigation completes, so re-enabling would allow a double submit.
  const onboardingBusy = onboarding.isPending || onboarding.isSuccess;
  const actionLabel = linkExpired
    ? 'Open a new setup link'
    : account ? 'Continue payout setup' : 'Set up payouts';

  return (
    <StudioSection
      id="studio-payouts"
      eyebrow="Get paid"
      title="Payouts"
      headingId="curator-payout-title"
      testId="curator-payout-card"
      description="Payout setup is free and does not require Curator Pro. Starting it lets fans join; verification lets earnings be paid out."
      chip={!loading && !status.isError && (
        <StudioChip tone={payoutTone(account)}>{payoutLabel(account)}</StudioChip>
      )}
    >
      <StudioNotice testId="curator-payout-notice" className="mb-5">
        {flow === 'return' && !loading && !status.isError
          ? payoutsActive
            ? 'Payout setup is complete.'
            : 'Payout setup started. Verification is still in progress; see the status below.'
          : linkExpired
            ? 'Your secure payout setup link expired. Open a new link to continue.'
            : null}
      </StudioNotice>
      <div className="space-y-5">
        {loading ? (
          <output className="text-sm text-muted-foreground">Loading payout status…</output>
        ) : status.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {getUserFacingApiErrorMessage(status.error, 'Payout status is unavailable.')}
              {' '}Your free profile and regular Cassette features still work.
            </p>
            <Button type="button" variant="outline" onClick={() => void status.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed">{statusCopy(account)}</p>

            {account && (
              <dl className="divide-y divide-border/70 text-sm">
                <ReceiptRow
                  className="py-2.5"
                  label="Accept members"
                  value={<span className="text-success-text">Ready</span>}
                />
                <ReceiptRow
                  className="py-2.5"
                  label="Receive payouts"
                  value={payoutsActive
                    ? <span className="text-success-text">Ready</span>
                    : needsAttention(account) ? 'Needs your information' : 'Waiting for verification'}
                />
                <ReceiptRow
                  className="py-2.5"
                  label="Last checked"
                  value={account.capabilityCheckedAtUtc
                    ? checkedAtFormatter.format(new Date(account.capabilityCheckedAtUtc))
                    : 'Not yet'}
                />
              </dl>
            )}

            {onboarding.isError && (
              <p role="alert" className="text-sm text-destructive">
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
