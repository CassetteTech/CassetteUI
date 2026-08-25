'use client';

/** Renders a fan's server-authorized membership offer and current billing actions. */

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import {
  formatCuratorPlanPrice,
  type CuratorPage,
} from '@/services/curator';
import type {
  MembershipInterval,
  MembershipStatus,
  MembershipStatusView,
} from '@/services/membership';
import { cn } from '@/lib/utils';

const membershipEndFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function CuratorMembershipCard({
  page,
  displayName,
  membershipId,
  interval,
  status,
  statusLoading,
  statusUnavailable,
  authenticated,
  notice,
  error,
  checkoutPending,
  portalPending,
  checkoutCanceled,
  noticeAction,
  onIntervalChange,
  onJoin,
  onManage,
  onCheckStatus,
}: {
  page: CuratorPage;
  displayName: string;
  membershipId: string;
  interval: MembershipInterval;
  status: MembershipStatusView | null;
  statusLoading: boolean;
  statusUnavailable: boolean;
  authenticated: boolean;
  notice: string | null;
  error: string | null;
  checkoutPending: boolean;
  portalPending: boolean;
  checkoutCanceled: boolean;
  noticeAction: { label: string; onClick: () => void } | null;
  onIntervalChange: (interval: MembershipInterval) => void;
  onJoin: () => void;
  onManage: (
    membershipSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
    status: MembershipStatus,
  ) => void;
  onCheckStatus: () => void;
}) {
  const plan = page.membership;
  const membership = status?.membership;
  const planMatchesMembership = !membership || membership.planId === plan?.planId;
  const displayedPlan = status?.canSubscribe === false && !planMatchesMembership ? null : plan;
  const annualAvailable = displayedPlan?.annualAmountMinor != null &&
    displayedPlan.annualServiceFeeMinor != null;
  const displayedInterval = membership &&
    planMatchesMembership &&
    (status?.canSubscribe === false || membership.status === 'incomplete')
    ? membership.billingInterval
    : interval;
  const selectedFace = displayedInterval === 'year'
    ? displayedPlan?.annualAmountMinor
    : displayedPlan?.amountMinor;
  const selectedFee = displayedInterval === 'year'
    ? displayedPlan?.annualServiceFeeMinor
    : displayedPlan?.serviceFeeMinor;
  const selectedPrice = displayedPlan && selectedFace != null && selectedFee != null
    ? formatCuratorPlanPrice(selectedFace, selectedFee, displayedPlan.currency)
    : null;
  const canJoin = Boolean(plan) && (!authenticated || status?.canSubscribe === true);
  const statusNotice = membership?.cancelAtPeriodEnd
    ? membership.paidThroughUtc
      ? `Your membership will end on ${membershipEndFormatter.format(new Date(membership.paidThroughUtc))}.`
      : 'Your membership will end after the current billing period.'
    : membership?.status === 'canceled'
      ? 'Your membership is canceled.'
      : null;

  const manageButton = !page.viewer.isOwner && membership?.canManage ? (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => onManage(
        membership.membershipSubscriptionId,
        membership.cancelAtPeriodEnd,
        membership.status,
      )}
      disabled={portalPending}
      data-testid="membership-manage"
    >
      {portalPending ? (
        <>
          <Spinner size="sm" />
          Opening management…
        </>
      ) : 'Manage membership'}
    </Button>
  ) : null;

  const noticeBlock = (
    <>
      {(notice ?? statusNotice) && (
        <output className="mt-4 block text-sm text-muted-foreground" data-testid="membership-notice">
          {notice ?? statusNotice}
        </output>
      )}
      {notice && noticeAction && (
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={noticeAction.onClick}>
          {noticeAction.label}
        </Button>
      )}
      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    </>
  );

  // Active member: collapse to a slim confirmation row — no pitch, no pricing.
  if (page.viewer.isMember) {
    return (
      <aside className="lg:sticky lg:top-6" aria-label="Membership">
        <Card id={membershipId} data-testid="curator-membership-card" className="border-foreground/30 elev-1">
          <CardContent>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge variant="secondary" className="px-3 py-1.5">
                <Check aria-hidden />
                Member
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {displayedPlan?.name ?? `${displayName} membership`}
              </span>
            </div>
            {manageButton && <div className="mt-4">{manageButton}</div>}
            {noticeBlock}
          </CardContent>
        </Card>
      </aside>
    );
  }

  return (
    <aside className="lg:sticky lg:top-6" aria-label="Membership">
      <Card id={membershipId} data-testid="curator-membership-card" className="border-foreground/30 elev-2">
        <CardHeader>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Membership
          </p>
          <h2 className="text-balance break-words font-teko text-2xl font-semibold uppercase leading-none">
            {displayedPlan?.name ?? `${displayName} membership`}
          </h2>
          {selectedPrice && (
            <div className="pt-2">
              <span className="font-teko text-3xl font-bold tabular-nums">{selectedPrice}</span>
              <span className="text-sm text-muted-foreground">/{displayedInterval}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {displayedPlan?.description && (
            <p className="whitespace-pre-line text-pretty break-words text-sm leading-relaxed text-muted-foreground">
              {displayedPlan.description}
            </p>
          )}
          {displayedPlan && annualAvailable && canJoin && !page.viewer.isOwner &&
            !(membership?.status === 'incomplete' && planMatchesMembership) && (
            <RadioGroup
              value={interval}
              // SAFETY: the only rendered items are 'month' and 'year', both MembershipInterval.
              onValueChange={(value) => onIntervalChange(value as MembershipInterval)}
              aria-label="Billing interval"
              className="mt-5 grid grid-cols-2 gap-2"
            >
              {(['month', 'year'] as const).map((option) => (
                <label
                  key={option}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-center text-sm transition-colors hover:border-foreground/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
                    interval === option && 'border-primary bg-primary/10 font-semibold hover:border-primary',
                  )}
                >
                  <RadioGroupItem
                    value={option}
                    className="sr-only"
                    data-testid={`membership-interval-${option}`}
                  />
                  {option === 'month' ? 'Monthly' : 'Annual'}
                </label>
              ))}
            </RadioGroup>
          )}
          {displayedPlan && selectedFace != null && selectedFee != null && selectedFee > 0 && canJoin && (
            <dl className="mt-4 space-y-1 border-y py-3 text-sm tabular-nums">
              <div className="flex justify-between gap-3">
                <dt>Membership</dt>
                <dd>{formatCuratorPlanPrice(selectedFace, 0, displayedPlan.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-muted-foreground">
                <dt>Service fee</dt>
                <dd>{formatCuratorPlanPrice(selectedFee, 0, displayedPlan.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-semibold">
                <dt>Total</dt>
                <dd>{selectedPrice}</dd>
              </div>
            </dl>
          )}
          {displayedPlan && displayedPlan.benefits.length > 0 && (
            <ul className="mt-5 space-y-3" aria-label="Membership benefits">
              {displayedPlan.benefits.map((benefit) => (
                <li key={benefit.featureKey} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="font-semibold">{benefit.name}</span>
                    {benefit.description && (
                      <span className="mt-0.5 block text-muted-foreground">{benefit.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 space-y-2">
            {page.viewer.isOwner ? (
              <p className="text-sm font-medium text-muted-foreground">Your published membership plan</p>
            ) : statusLoading && authenticated ? (
              <p className="text-sm text-muted-foreground">Checking membership…</p>
            ) : statusUnavailable && authenticated ? (
              <>
                <p className="text-sm text-muted-foreground">Membership status is temporarily unavailable.</p>
                <Button variant="outline" className="w-full" onClick={onCheckStatus}>
                  Try again
                </Button>
              </>
            ) : canJoin ? (
              <>
                <Button
                  className="w-full"
                  onClick={onJoin}
                  disabled={checkoutPending}
                  data-testid="membership-join"
                >
                  {checkoutPending ? (
                    <>
                      <Spinner size="sm" />
                      Opening secure Checkout…
                    </>
                  ) : checkoutCanceled && membership?.status === 'incomplete'
                    ? 'Retry Checkout'
                    : `Join ${displayName}`}
                </Button>
                {!authenticated && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    You will be asked to sign in or create a free account first.
                  </p>
                )}
              </>
            ) : membership?.status === 'incomplete' ? (
              <>
                <p className="text-sm text-muted-foreground">Checkout confirmation is pending.</p>
                <Button variant="outline" className="w-full" onClick={onCheckStatus}>
                  Check status
                </Button>
              </>
            ) : null}

            {manageButton}
          </div>
          {noticeBlock}
        </CardContent>
      </Card>
    </aside>
  );
}
