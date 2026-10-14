'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthState } from '@/hooks/use-auth';
import { useProviderReturnPoll } from '@/hooks/use-provider-return-poll';
import { useRedirectMutation } from '@/hooks/use-redirect-mutation';
import { apiService } from '@/services/api';
import type { CuratorProStatus } from '@/services/curator-pro';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { StudioNotice, StudioSection, StudioStat } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { removeQueryParameters } from '@/utils/remove-query-parameters';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { tryStorage } from '@/lib/best-effort';

type ProFlow = 'return' | 'portal-return' | null;

const portalBaselineSchema = z.object({
  status: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
}).strict();
type PortalBaseline = z.infer<typeof portalBaselineSchema>;

const portalBaselinePrefix = 'cassette:curator-pro-portal-baseline:';
const priceLocale = 'en-US';
const dateFormatter = new Intl.DateTimeFormat(priceLocale, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function readPortalBaseline(userId: string): PortalBaseline | null {
  const key = `${portalBaselinePrefix}${userId}`;
  return tryStorage(() => {
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!stored) return null;
    const parsed = portalBaselineSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  }, null);
}

function writePortalBaseline(userId: string, status: CuratorProStatus) {
  tryStorage(() => sessionStorage.setItem(
    `${portalBaselinePrefix}${userId}`,
    JSON.stringify({
      status: status.status,
      cancelAtPeriodEnd: status.cancelAtPeriodEnd,
    } satisfies PortalBaseline),
  ), undefined);
}

function formatMoney(amountMinor: number, currency: string) {
  return formatPaidPromotionMinorAmount(amountMinor, currency, priceLocale);
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

const endOfProCopy = 'Your memberships and earnings are not affected.';

function lifecycleCopy(status: CuratorProStatus): string | null {
  if (status.cancelAtPeriodEnd) {
    const end = status.paidThroughUtc
      ? `on ${dateFormatter.format(new Date(status.paidThroughUtc))}`
      : 'after the current billing period';
    return `Curator Pro is canceling ${end}. ${endOfProCopy}`;
  }
  if (status.hasAccess) return null;
  if (status.status === 'trialing' || status.status === 'active') {
    return 'Your subscription is current, but access is unavailable.';
  }
  if (status.status === 'past_due' || status.status === 'unpaid') {
    return 'Payment needs attention. Manage billing to restore access.';
  }
  if (status.status === 'canceled') return 'Curator Pro is canceled. Your memberships and earnings keep working.';
  return 'Curator Pro is optional. Memberships and earnings work without it.';
}

export function CuratorProCard() {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const [flow, setFlow] = useState<ProFlow>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timedOutFlow, setTimedOutFlow] = useState<ProFlow>(null);
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
  const checkout = useRedirectMutation({
    mutationFn: () => apiService.createCuratorProCheckout(),
    onSuccess: (result) => window.location.assign(result.checkoutUrl),
  });
  const portal = useRedirectMutation({
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

  useProviderReturnPoll({
    flow,
    polling: flow !== null,
    read: statusQuery,
    onTimeout: (timedOut) => {
      setTimedOutFlow(timedOut);
      finishFlow(timedOut === 'return'
        ? 'Curator Pro activation is still processing. Refresh in a moment.'
        : 'No billing change has reached Cassette yet. A change made in Stripe can take a minute to appear.');
    },
    onRead: (returned, current) => {
      if (!flowHandled.current) settleProReturn(returned, current);
    },
  });

  function settleProReturn(flow: 'return' | 'portal-return', status: CuratorProStatus) {
    if (flow === 'return') {
      if (status.hasAccess) {
        finishFlow('Curator Pro is active.');
      } else if (status.status === 'trialing' || status.status === 'active') {
        finishFlow('Your Curator Pro subscription is current, but access is unavailable.');
      } else if (status.status !== null && status.status !== 'incomplete') {
        finishFlow('Checkout did not activate Curator Pro. You can try again.');
      }
      return;
    }

    const baseline = portalBaseline.current;
    const canceled = baseline !== null && baseline.status !== 'canceled' && status.status === 'canceled';
    const canceling = baseline !== null && !baseline.cancelAtPeriodEnd && status.cancelAtPeriodEnd;
    const current = status.status === 'active' || status.status === 'trialing';
    const reactivated = baseline !== null && current && (
      baseline.status === 'canceled' ||
      (baseline.cancelAtPeriodEnd && !status.cancelAtPeriodEnd)
    );
    if (canceled) {
      finishFlow('Curator Pro is canceled. Your memberships and earnings keep working.');
    } else if (canceling) {
      finishFlow(`Curator Pro will end${status.paidThroughUtc ? ` on ${dateFormatter.format(new Date(status.paidThroughUtc))}` : ' after the current billing period'}. ${endOfProCopy}`);
    } else if (reactivated) {
      finishFlow('Your Curator Pro subscription will continue.');
    } else if (baseline !== null && baseline.status !== status.status) {
      finishFlow('Your Curator Pro billing status changed. Review the current status below.');
    }
  }

  const actionError = checkout.isError
    ? `${getUserFacingApiErrorMessage(checkout.error, 'We could not start secure Checkout.')} Try again.`
    : portal.isError
      ? `${getUserFacingApiErrorMessage(portal.error, 'We could not open billing management.')} Try again.`
      : null;
  const actionPending = checkout.busy || portal.busy;

  if (!status?.available && !status?.canManage) return null;

  return (
    <StudioSection
      id="studio-pro"
      title="Curator Pro"
      headingId="curator-pro-title"
      testId="curator-pro-card"
      description="Optional curation tools. Earning from memberships does not need it."
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

        {
          <>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <StudioStat
                label="Your monthly price"
                value={formatMoney(status.discountKind === 'none' ? status.monthlyPriceMinor : 0, status.currency)}
                hint={status.discountKind !== 'none' && (
                  <>
                    <s className="font-mono tabular-nums">{formatMoney(status.monthlyPriceMinor, status.currency)}</s>
                    {' '}{discountCopy(status)}
                  </>
                )}
              />
              <StudioStat
                label={status.hasAccess ? (status.cancelAtPeriodEnd ? 'Ends' : 'Renews') : 'Status'}
                value={status.hasAccess
                  ? (status.paidThroughUtc ? dateFormatter.format(new Date(status.paidThroughUtc)) : 'Current period')
                  : statusLabel(status)}
              />
            </dl>
            {lifecycleCopy(status) && (
              <p className="max-w-prose text-sm leading-relaxed">{lifecycleCopy(status)}</p>
            )}
            {status.canManage && status.hasAccess && !status.cancelAtPeriodEnd && (
              <p className="max-w-prose text-xs text-muted-foreground">
                Cancel in billing settings. Pro ends on the date shown there. {endOfProCopy}
              </p>
            )}
            {status.canSubscribe && (
              <p className="text-xs text-muted-foreground">Promo codes go in at Checkout.</p>
            )}
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
                  {checkout.busy
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
                  {portal.busy ? 'Opening…' : 'Manage billing'}
                </Button>
              )}
            </div>
          </>
        }
      </div>
    </StudioSection>
  );
}
