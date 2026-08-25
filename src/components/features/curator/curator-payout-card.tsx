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
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type PayoutFlow = 'checking' | 'status' | 'return';

const checkedAtFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function removePayoutQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('payout');
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function payoutLabel(account: CuratorPayoutAccount | null) {
  if (!account) return 'Not started';
  if (account.transfersCapabilityStatus === 'active') return 'Ready';
  if (account.onboardingStatus === 'restricted' || account.requirementsDue) return 'Needs attention';
  return 'In progress';
}

function payoutTone(account: CuratorPayoutAccount | null): StudioChipTone {
  if (!account) return 'neutral';
  if (account.transfersCapabilityStatus === 'active') return 'positive';
  if (account.onboardingStatus === 'restricted' || account.requirementsDue) return 'warning';
  return 'neutral';
}

function capabilityLabel(status: string | null) {
  switch (status) {
    case 'active': return 'Ready';
    case 'pending': return 'Pending';
    case 'restricted': return 'Restricted';
    case 'unsupported': return 'Unavailable';
    case null: return 'Not checked';
    default: return 'Not ready';
  }
}

function statusCopy(account: CuratorPayoutAccount | null) {
  if (!account) {
    return 'Set up secure payouts when you are ready to receive membership earnings.';
  }
  if (account.transfersCapabilityStatus === 'active') {
    return 'Your payout account is ready to receive transfers.';
  }
  if (account.onboardingStatus === 'restricted' || account.requirementsDue) {
    return 'Your payout account needs more information before it can receive transfers.';
  }
  return 'Your payout account is not ready to receive transfers yet.';
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
      removePayoutQuery();
      setFlow('status');
      return;
    }
    setFlow(requestedFlow === 'return' ? 'return' : 'status');
  }, []);

  useEffect(() => {
    if (flow !== 'return' || !status.isSuccess || returnHandled.current) return;
    returnHandled.current = true;
    queryClient.setQueryData(['curator-payout-account', 'current'], status.data ?? null);
    removePayoutQuery();
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
      description="Payout setup is free and does not require Curator Pro."
      chip={!loading && !status.isError && (
        <StudioChip tone={payoutTone(account)}>{payoutLabel(account)}</StudioChip>
      )}
    >
      <StudioNotice testId="curator-payout-notice" className="mb-5">
        {flow === 'return' && !loading && !status.isError
          ? payoutsActive
            ? 'Payout setup is complete.'
            : 'Payout setup is not complete yet. Review the current status below.'
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
                  label="Onboarding"
                  value={<span className="capitalize">{account.onboardingStatus}</span>}
                />
                <ReceiptRow
                  className="py-2.5"
                  label="Transfers"
                  value={capabilityLabel(account.transfersCapabilityStatus)}
                />
                <ReceiptRow
                  className="py-2.5"
                  label="Information required"
                  value={account.requirementsDue ? 'Yes' : 'No'}
                />
                <ReceiptRow
                  className="py-2.5"
                  label="Status checked"
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

            {payoutsActive ? (
              // Bridge only exposes the onboarding-link endpoint; Stripe hosted
              // onboarding also serves as the update surface for active accounts.
              <Button
                type="button"
                variant="outline"
                data-testid="curator-payout-onboarding"
                className="w-full sm:w-auto"
                disabled={onboardingBusy}
                onClick={() => onboarding.mutate()}
              >
                {onboardingBusy ? 'Opening…' : 'Update payout details'}
              </Button>
            ) : (
              <Button
                type="button"
                data-testid="curator-payout-onboarding"
                className="w-full sm:w-auto"
                disabled={onboardingBusy}
                onClick={() => onboarding.mutate()}
              >
                {onboardingBusy ? 'Opening…' : actionLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </StudioSection>
  );
}
