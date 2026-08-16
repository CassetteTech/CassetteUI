'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  onIntervalChange,
  onJoin,
  onManage,
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
  onIntervalChange: (interval: MembershipInterval) => void;
  onJoin: () => void;
  onManage: (
    membershipSubscriptionId: string,
    cancelAtPeriodEnd: boolean,
    status: MembershipStatus,
  ) => void;
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
      ? `Your membership will end on ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(new Date(membership.paidThroughUtc))}.`
      : 'Your membership will end after the current billing period.'
    : membership?.status === 'canceled'
      ? 'Your membership is canceled.'
      : null;

  return (
    <aside className="order-first lg:order-last lg:sticky lg:top-6" aria-label="Membership">
      <Card id={membershipId} data-testid="curator-membership-card" className="border-foreground/30 elev-2">
        <CardHeader>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Membership
          </p>
          <h2 className="break-words font-teko text-3xl font-semibold uppercase leading-none">
            {displayedPlan?.name ?? `${displayName} membership`}
          </h2>
          {selectedPrice && (
            <div className="pt-2">
              <span className="font-teko text-3xl font-bold">{selectedPrice}</span>
              <span className="text-sm text-muted-foreground">/{displayedInterval}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {displayedPlan?.description && (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {displayedPlan.description}
            </p>
          )}
          {displayedPlan && annualAvailable && canJoin && !page.viewer.isOwner &&
            !(membership?.status === 'incomplete' && planMatchesMembership) && (
            <fieldset className="mt-5 grid grid-cols-2 gap-2">
              <legend className="sr-only">Billing interval</legend>
              {(['month', 'year'] as const).map((option) => (
                <label
                  key={option}
                  className={cn(
                    'cursor-pointer rounded-md border px-3 py-2 text-center text-sm capitalize has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
                    interval === option && 'border-primary bg-primary/10 font-semibold',
                  )}
                >
                  <input
                    type="radio"
                    name={`membership-interval-${membershipId}`}
                    value={option}
                    checked={interval === option}
                    onChange={() => onIntervalChange(option)}
                    className="sr-only"
                    data-testid={`membership-interval-${option}`}
                  />
                  {option === 'month' ? 'Monthly' : 'Annual'}
                </label>
              ))}
            </fieldset>
          )}
          {displayedPlan && selectedFace != null && selectedFee != null && selectedFee > 0 && canJoin && (
            <dl className="mt-4 space-y-1 border-y py-3 text-sm">
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
            ) : page.viewer.isMember ? (
              <Badge variant="secondary" className="px-3 py-1.5">Member</Badge>
            ) : statusLoading && authenticated ? (
              <p className="text-sm text-muted-foreground">Checking membership…</p>
            ) : statusUnavailable && authenticated ? (
              <p className="text-sm text-muted-foreground">Membership status is temporarily unavailable.</p>
            ) : canJoin ? (
              <Button
                className="w-full"
                onClick={onJoin}
                disabled={checkoutPending}
                data-testid="membership-join"
              >
                {checkoutPending
                  ? 'Opening secure Checkout…'
                  : checkoutCanceled && membership?.status === 'incomplete'
                    ? 'Retry Checkout'
                    : `Join ${displayName}`}
              </Button>
            ) : membership?.status === 'incomplete' ? (
              <p className="text-sm text-muted-foreground">Checkout confirmation is pending.</p>
            ) : null}

            {!page.viewer.isOwner && membership?.canManage && (
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
                {portalPending ? 'Opening management…' : 'Manage membership'}
              </Button>
            )}
          </div>
          {(notice ?? statusNotice) && (
            <output className="mt-4 block text-sm text-muted-foreground" data-testid="membership-notice">
              {notice ?? statusNotice}
            </output>
          )}
          {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        </CardContent>
      </Card>
    </aside>
  );
}
