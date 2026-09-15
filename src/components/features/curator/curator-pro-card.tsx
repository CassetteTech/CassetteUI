'use client';

/** Handles Curator Pro checkout and portal returns using Bridge status as the sole authority. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import type { CuratorProStatus } from '@/services/curator-pro';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import {
  ReceiptRow,
  StudioChip,
  StudioNotice,
  StudioSection,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { removeQueryParameters } from '@/utils/remove-query-parameters';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type ProFlow = 'return' | 'portal-return' | null;

const portalBaselineSchema = z.object({
  status: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
}).strict();
type PortalBaseline = z.infer<typeof portalBaselineSchema>;

const portalBaselinePrefix = 'cassette:curator-pro-portal-baseline:';
const priceLocale = 'en-US';
const feeFormatter = new Intl.NumberFormat(priceLocale, {
  style: 'percent',
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat(priceLocale, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function readPortalBaseline(userId: string): PortalBaseline | null {
  const key = `${portalBaselinePrefix}${userId}`;
  try {
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!stored) return null;
    const parsed = portalBaselineSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writePortalBaseline(userId: string, status: CuratorProStatus) {
  try {
    sessionStorage.setItem(
      `${portalBaselinePrefix}${userId}`,
      JSON.stringify({
        status: status.status,
        cancelAtPeriodEnd: status.cancelAtPeriodEnd,
      } satisfies PortalBaseline),
    );
  } catch {
    // Portal still works; without a baseline the return message stays neutral.
  }
}

function formatMoney(amountMinor: number, currency: string) {
  return formatPaidPromotionMinorAmount(amountMinor, currency, priceLocale);
}

function statusTone(status: CuratorProStatus): StudioChipTone {
  if (status.cancelAtPeriodEnd) return 'warning';
  if (status.hasAccess) return 'positive';
  if (status.status === 'past_due' || status.status === 'unpaid') return 'danger';
  return 'neutral';
}

function statusLabel(status: CuratorProStatus) {
  if (status.cancelAtPeriodEnd) return 'Canceling';
  if (status.hasAccess) return 'Active';

  switch (status.status) {
    case 'trialing':
    case 'active': return 'Access unavailable';
    case 'past_due': return 'Payment past due';
    case 'canceled': return 'Canceled';
    case 'unpaid': return 'Payment unpaid';
    case 'paused': return 'Paused';
    case 'incomplete': return 'Checkout pending';
    default: return 'Not subscribed';
  }
}

function discountCopy(status: CuratorProStatus) {
  const basePrice = `${formatMoney(status.monthlyPriceMinor, status.currency)}/month`;
  if (status.discountKind === 'forever') return 'Free forever.';
  if (status.discountKind === 'temporary' && status.discountEndsAtUtc) {
    return `Free through ${dateFormatter.format(new Date(status.discountEndsAtUtc))}, then ${basePrice}.`;
  }
  return 'Full price.';
}

/** What ending Curator Pro means, shown before the billing handoff and on scheduled cancellations. */
const endOfProCopy = 'After that, no new paid joins and no member-only publishing; each existing member is scheduled to end at the close of their own paid period. Your free profile and earned balances stay yours.';

function lifecycleCopy(status: CuratorProStatus) {
  if (status.cancelAtPeriodEnd) {
    const end = status.paidThroughUtc
      ? ` on ${dateFormatter.format(new Date(status.paidThroughUtc))}`
      : ' at the end of the current billing period';
    return `Curator Pro is canceling${end}. Until then you keep every Pro capability. ${endOfProCopy}`;
  }
  if (status.hasAccess) {
    return 'Curator Pro is active. Paid plan and payout requirements still apply before membership monetization.';
  }
  if (status.status === 'trialing' || status.status === 'active') {
    return 'Your Curator Pro subscription is current, but access is unavailable.';
  }
  if (status.status === 'past_due' || status.status === 'unpaid') {
    return 'Payment needs attention. Manage billing to restore Curator Pro access.';
  }
  if (status.status === 'canceled') {
    return 'Curator Pro is canceled. Your free curator profile stays available.';
  }
  return 'Your free curator profile stays available. Curator Pro is required only to lock posts or earn membership revenue.';
}

export function CuratorProCard() {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const [flow, setFlow] = useState<ProFlow>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set when the checkout poll gives up, so the curator can restart it themselves.
  const [timedOutFlow, setTimedOutFlow] = useState<ProFlow>(null);
  const flowInitialized = useRef(false);
  const flowHandled = useRef(false);
  const portalBaseline = useRef<PortalBaseline | null>(null);
  const statusQuery = useQuery({
    queryKey: ['curator-pro-status', userId],
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(userId),
    staleTime: 0,
    // Only a checkout return waits on the payment mirror; a portal return
    // resolves on the first fresh status read.
    refetchInterval: flow === 'return' ? 1_000 : false,
  });
  const status = statusQuery.data;
  const checkout = useMutation({
    mutationFn: () => apiService.createCuratorProCheckout(),
    onSuccess: (result) => window.location.assign(result.checkoutUrl),
  });
  const portal = useMutation({
    mutationFn: async () => {
      if (!userId || !status) throw new Error('Curator Pro status is unavailable');
      const result = await apiService.createCuratorProPortal();
      writePortalBaseline(userId, status);
      return result;
    },
    onSuccess: (result) => window.location.assign(result.portalUrl),
  });

  const finishFlow = useCallback((message: string) => {
    flowHandled.current = true;
    setFlow(null);
    setNotice(message);
    removeQueryParameters('pro', 'session_id');
  }, []);

  useEffect(() => {
    if (flowInitialized.current) return;

    const requestedFlow = new URL(window.location.href).searchParams.get('pro');
    removeQueryParameters('session_id');
    if (requestedFlow === 'canceled') {
      flowInitialized.current = true;
      setNotice('Checkout was canceled. You were not charged.');
      removeQueryParameters('pro');
      return;
    }
    if (requestedFlow !== 'return' && requestedFlow !== 'portal-return') {
      flowInitialized.current = true;
      return;
    }
    if (!userId) return;

    flowInitialized.current = true;
    if (requestedFlow === 'portal-return') {
      portalBaseline.current = readPortalBaseline(userId);
    }
    setFlow(requestedFlow);
  }, [userId]);

  useEffect(() => {
    if (flow !== 'return') return;
    const timeout = window.setTimeout(() => {
      setTimedOutFlow(flow);
      finishFlow('Curator Pro activation is still processing. Refresh in a moment.');
    }, 30_000);
    return () => window.clearTimeout(timeout);
  }, [finishFlow, flow]);

  const fetchedAfterMount = statusQuery.isFetchedAfterMount;
  useEffect(() => {
    // Only a status read completed by this page load counts; a cached entry
    // from before the provider handoff must not resolve the flow.
    if (!flow || !status || !fetchedAfterMount || flowHandled.current) return;
    if (flow === 'return') {
      if (status.hasAccess) {
        finishFlow('Curator Pro is active. Paid plan and payout requirements still apply before membership monetization.');
      } else if (status.status === 'trialing' || status.status === 'active') {
        finishFlow('Your Curator Pro subscription is current, but access is unavailable.');
      } else if (status.status !== null && status.status !== 'incomplete') {
        finishFlow('Checkout did not activate Curator Pro. You can try again.');
      }
      return;
    }

    // Portal return: an unchanged status is the normal outcome (the curator
    // looked or updated a card), so it succeeds immediately rather than waiting.
    const baseline = portalBaseline.current;
    const canceled = baseline !== null && baseline.status !== 'canceled' && status.status === 'canceled';
    const canceling = baseline !== null && !baseline.cancelAtPeriodEnd && status.cancelAtPeriodEnd;
    const current = status.status === 'active' || status.status === 'trialing';
    const reactivated = baseline !== null && current && (
      baseline.status === 'canceled' ||
      (baseline.cancelAtPeriodEnd && !status.cancelAtPeriodEnd)
    );
    if (canceled) {
      finishFlow('Curator Pro is canceled. Your free curator profile stays available.');
    } else if (canceling) {
      finishFlow(`Curator Pro will end${status.paidThroughUtc ? ` on ${dateFormatter.format(new Date(status.paidThroughUtc))}` : ' after the current billing period'}. ${endOfProCopy}`);
    } else if (reactivated) {
      finishFlow('Your Curator Pro subscription will continue.');
    } else if (baseline !== null && baseline.status !== status.status) {
      finishFlow('Your Curator Pro billing status changed. Review the current status below.');
    } else {
      finishFlow('Billing settings are up to date. Your Curator Pro status is unchanged.');
    }
  }, [fetchedAfterMount, finishFlow, flow, status]);

  const actionError = checkout.isError
    ? `${getUserFacingApiErrorMessage(checkout.error, 'We could not start secure Checkout.')} Try again.`
    : portal.isError
      ? `${getUserFacingApiErrorMessage(portal.error, 'We could not open billing management.')} Try again.`
      : null;
  // isSuccess keeps the buttons disabled while the Stripe navigation is pending,
  // preventing a double submit after the mutation resolves.
  const actionPending = checkout.isPending || checkout.isSuccess ||
    portal.isPending || portal.isSuccess;

  return (
    <StudioSection
      id="studio-pro"
      eyebrow="Subscription"
      title="Curator Pro"
      headingId="curator-pro-title"
      testId="curator-pro-card"
      description="Curator Pro is required before locked posts and fan membership revenue. Regular Cassette features stay free."
      chip={status && <StudioChip tone={statusTone(status)}>{statusLabel(status)}</StudioChip>}
    >
      <StudioNotice testId="curator-pro-notice" className="mb-5">{notice}</StudioNotice>
      <div className="space-y-5">
        {timedOutFlow && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setNotice(null);
              flowHandled.current = false;
              setTimedOutFlow(null);
              setFlow(timedOutFlow);
            }}
          >
            Check again
          </Button>
        )}

        {statusQuery.isPending ? (
          <output className="text-sm text-muted-foreground">Loading Curator Pro…</output>
        ) : statusQuery.isError && !status ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {getUserFacingApiErrorMessage(statusQuery.error, 'Curator Pro status is unavailable.')}
              {' '}Your free curator profile still works.
            </p>
            <Button type="button" variant="outline" onClick={() => void statusQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : status ? (
          <>
            <dl className="divide-y divide-border/70 text-sm">
              <ReceiptRow
                className="py-2.5"
                label="Base monthly price"
                value={formatMoney(status.monthlyPriceMinor, status.currency)}
              />
              <ReceiptRow
                className="py-2.5"
                label="Your monthly price"
                value={
                  <span className="font-semibold text-primary">
                    {formatMoney(status.discountKind === 'none' ? status.monthlyPriceMinor : 0, status.currency)}
                  </span>
                }
              />
              {status.discountKind !== 'none' && (
                <ReceiptRow className="py-2.5" label="Offer" value={discountCopy(status)} />
              )}
              <ReceiptRow
                className="py-2.5"
                label="Fan membership platform fee"
                value={feeFormatter.format(status.platformFeeBps / 10_000)}
              />
            </dl>

            <p className="text-sm leading-relaxed">{lifecycleCopy(status)}</p>
            {status.canManage && status.hasAccess && !status.cancelAtPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Canceling in billing settings ends Curator Pro on the effective date shown there, which may be
                immediate. {endOfProCopy}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Promotional codes are entered in secure Stripe Checkout.
            </p>

            {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {status.canSubscribe && (
                <Button
                  type="button"
                  data-testid="curator-pro-subscribe"
                  className="w-full sm:w-auto"
                  disabled={actionPending}
                  onClick={() => {
                    portal.reset();
                    checkout.mutate();
                  }}
                >
                  {checkout.isPending || checkout.isSuccess
                    ? 'Opening Checkout…'
                    : status.status === 'canceled' ? 'Restart Curator Pro' : 'Start Curator Pro'}
                </Button>
              )}
              {status.canManage && (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="curator-pro-manage"
                  className="w-full sm:w-auto"
                  disabled={actionPending}
                  onClick={() => {
                    checkout.reset();
                    portal.mutate();
                  }}
                >
                  {portal.isPending || portal.isSuccess ? 'Opening…' : 'Manage billing'}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </StudioSection>
  );
}
