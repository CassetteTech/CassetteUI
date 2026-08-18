'use client';

/** Manages Stripe Connect onboarding and renders only the payout status confirmed by Bridge. */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  StudioChip,
  StudioFact,
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

type PayoutFlow = 'checking' | 'status' | 'return' | 'refresh';

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
      setFlow('refresh');
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
  const actionLabel = account ? 'Continue payout setup' : 'Set up payouts';

  return (
    <StudioSection
      id="studio-payouts"
      eyebrow={<><span className="text-primary">Step 3</span> · Get paid</>}
      title="Payouts"
      headingId="curator-payout-title"
      testId="curator-payout-card"
      description="Payout setup is free and does not require Curator Pro."
      chip={!loading && !status.isError && (
        <StudioChip tone={payoutTone(account)}>{payoutLabel(account)}</StudioChip>
      )}
    >
      <div className="space-y-5">
        {flow === 'refresh' ? (
          <div className="space-y-3">
            <p className="text-sm">
              Your secure payout setup link expired. Open a new link to continue.
            </p>
            {onboarding.isError && (
              <p role="alert" className="text-sm text-destructive">
                We could not renew your secure payout setup link. Try again.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={onboarding.isPending}
              onClick={() => onboarding.mutate()}
            >
              {onboarding.isPending ? 'Opening…' : 'Open a new setup link'}
            </Button>
          </div>
        ) : loading ? (
          <output className="text-sm text-muted-foreground">Loading payout status…</output>
        ) : status.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              Payout status is unavailable. Your free profile and regular Cassette features still work.
            </p>
            <Button type="button" variant="outline" onClick={() => void status.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            {flow === 'return' && (
              <StudioNotice testId="curator-payout-notice">
                {account?.transfersCapabilityStatus === 'active'
                  ? 'Payout setup is complete.'
                  : 'Payout setup is not complete yet. Review the current status below.'}
              </StudioNotice>
            )}

            <p className="text-sm leading-relaxed">{statusCopy(account)}</p>

            {account && (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <StudioFact label="Onboarding">
                  <span className="capitalize">{account.onboardingStatus}</span>
                </StudioFact>
                <StudioFact label="Transfers">
                  {capabilityLabel(account.transfersCapabilityStatus)}
                </StudioFact>
                <StudioFact label="Information required">
                  {account.requirementsDue ? 'Yes' : 'No'}
                </StudioFact>
                <StudioFact label="Status checked">
                  {account.capabilityCheckedAtUtc
                    ? checkedAtFormatter.format(new Date(account.capabilityCheckedAtUtc))
                    : 'Not yet'}
                </StudioFact>
              </dl>
            )}

            {onboarding.isError && (
              <p role="alert" className="text-sm text-destructive">
                We could not open secure payout setup. Try again.
              </p>
            )}

            {account?.transfersCapabilityStatus !== 'active' && (
              <Button
                type="button"
                data-testid="curator-payout-onboarding"
                disabled={onboarding.isPending}
                onClick={() => onboarding.mutate()}
              >
                {onboarding.isPending ? 'Opening…' : actionLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </StudioSection>
  );
}
