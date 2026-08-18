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
  StudioChip,
  StudioFact,
  StudioNotice,
  StudioSection,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';

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

function removeQuery(...keys: string[]) {
  const url = new URL(window.location.href);
  for (const key of keys) url.searchParams.delete(key);
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

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

function lifecycleCopy(status: CuratorProStatus) {
  if (status.cancelAtPeriodEnd) {
    const end = status.paidThroughUtc
      ? ` on ${dateFormatter.format(new Date(status.paidThroughUtc))}`
      : ' at the end of the current billing period';
    return `Curator Pro is canceling${end}. Your free curator profile stays available.`;
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
  const flowInitialized = useRef(false);
  const flowHandled = useRef(false);
  const portalBaseline = useRef<PortalBaseline | null>(null);
  const statusQuery = useQuery({
    queryKey: ['curator-pro-status', userId],
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchInterval: flow ? 1_000 : false,
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
    removeQuery('pro', 'session_id');
  }, []);

  useEffect(() => {
    if (flowInitialized.current) return;

    const requestedFlow = new URL(window.location.href).searchParams.get('pro');
    removeQuery('session_id');
    if (requestedFlow === 'canceled') {
      flowInitialized.current = true;
      setNotice('Checkout was canceled. You were not charged.');
      removeQuery('pro');
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
    if (!flow) return;
    const timeout = window.setTimeout(() => {
      finishFlow(
        flow === 'return'
          ? 'Curator Pro activation is still processing. Refresh in a moment.'
          : 'We could not confirm a billing change yet. Refresh in a moment.',
      );
    }, 30_000);
    return () => window.clearTimeout(timeout);
  }, [finishFlow, flow]);

  useEffect(() => {
    if (!flow || !status || flowHandled.current) return;

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

    const baseline = portalBaseline.current;
    if (baseline === null) return;

    const canceled = baseline.status !== 'canceled' && status.status === 'canceled';
    const canceling = !baseline.cancelAtPeriodEnd && status.cancelAtPeriodEnd;
    const current = status.status === 'active' || status.status === 'trialing';
    const reactivated = current && (
      baseline.status === 'canceled' ||
      (baseline.cancelAtPeriodEnd && !status.cancelAtPeriodEnd)
    );
    if (canceled) {
      finishFlow('Curator Pro is canceled. Your free curator profile stays available.');
    } else if (canceling) {
      finishFlow('Curator Pro will end after the current billing period.');
    } else if (reactivated) {
      finishFlow('Your Curator Pro subscription will continue.');
    } else if (baseline.status !== status.status) {
      finishFlow('Your Curator Pro billing status changed. Review the current status below.');
    }
  }, [finishFlow, flow, status]);

  const actionError = checkout.isError
    ? 'We could not start secure Checkout. Try again.'
    : portal.isError
      ? 'We could not open billing management. Try again.'
      : null;
  const actionPending = checkout.isPending || portal.isPending;

  return (
    <StudioSection
      id="studio-pro"
      eyebrow={<><span className="text-primary">Step 2</span> · Subscription</>}
      title="Curator Pro"
      headingId="curator-pro-title"
      testId="curator-pro-card"
      description="Curator Pro is required before locked posts and fan membership revenue. Regular Cassette features stay free."
      chip={status && <StudioChip tone={statusTone(status)}>{statusLabel(status)}</StudioChip>}
    >
      <div className="space-y-5">
        {notice && <StudioNotice testId="curator-pro-notice">{notice}</StudioNotice>}

        {statusQuery.isPending ? (
          <output className="text-sm text-muted-foreground">Loading Curator Pro…</output>
        ) : statusQuery.isError && !status ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              Curator Pro status is unavailable. Your free curator profile still works.
            </p>
            <Button type="button" variant="outline" onClick={() => void statusQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : status ? (
          <>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <StudioFact label="Base monthly price">
                <span className="font-mono text-base font-semibold tabular-nums">
                  {formatMoney(status.monthlyPriceMinor, status.currency)}
                </span>
              </StudioFact>
              <StudioFact label="Your monthly price">
                <span className="font-mono text-base font-semibold tabular-nums text-primary">
                  {formatMoney(status.discountKind === 'none' ? status.monthlyPriceMinor : 0, status.currency)}
                </span>
              </StudioFact>
              <StudioFact label="Offer">{discountCopy(status)}</StudioFact>
              <StudioFact label="Fan membership platform fee">
                {feeFormatter.format(status.platformFeeBps / 10_000)}
              </StudioFact>
            </dl>

            <p className="text-sm leading-relaxed">{lifecycleCopy(status)}</p>
            <p className="text-xs text-muted-foreground">
              Promotional codes are entered in secure Stripe Checkout.
            </p>

            {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}

            <div className="flex flex-wrap gap-3">
              {status.canSubscribe && (
                <Button
                  type="button"
                  data-testid="curator-pro-subscribe"
                  disabled={actionPending}
                  onClick={() => {
                    portal.reset();
                    checkout.mutate();
                  }}
                >
                  {checkout.isPending
                    ? 'Opening Checkout…'
                    : status.status === 'canceled' ? 'Restart Curator Pro' : 'Start Curator Pro'}
                </Button>
              )}
              {status.canManage && (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="curator-pro-manage"
                  disabled={actionPending}
                  onClick={() => {
                    checkout.reset();
                    portal.mutate();
                  }}
                >
                  {portal.isPending ? 'Opening…' : 'Manage billing'}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </StudioSection>
  );
}
