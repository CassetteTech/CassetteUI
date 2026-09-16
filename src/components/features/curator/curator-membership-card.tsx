'use client';

/** Renders a fan's server-authorized membership offer and current billing actions. */

import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import type { CuratorPage } from '@/services/curator';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  formatMembershipDate,
  type MembershipInterval,
  type MembershipStatus,
  type MembershipStatusView,
} from '@/services/membership';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { BenefitList, MembershipOffer } from '@/components/features/membership/membership-offer';
import { WalletPass } from '@/components/features/curator/wallet-pass';
import { StudioNotice } from '@/components/features/curator/studio-shell';
import { useSharedPosition } from '@/hooks/use-shared-position';
import { cn } from '@/lib/utils';

export function CuratorMembershipCard({
  page,
  displayName,
  membershipId,
  feedHeadingId,
  interval,
  status,
  statusLoading,
  statusUnavailable,
  authenticated,
  activated,
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
  onViewMemberPosts,
}: {
  page: CuratorPage;
  displayName: string;
  membershipId: string;
  feedHeadingId: string;
  interval: MembershipInterval;
  status: MembershipStatusView | null;
  statusLoading: boolean;
  statusUnavailable: boolean;
  authenticated: boolean;
  activated: boolean;
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
  onViewMemberPosts: () => void;
}) {
  const plan = page.membership;
  const membership = status?.membership;
  // Keyed per curator so the matching pass on My memberships slides into this rail slot, and back.
  const memberPassRef = useRef<HTMLDivElement>(null);
  useSharedPosition(memberPassRef, `membership-pass:${page.curator.username}`);
  const planMatchesMembership = !membership || membership.planId === plan?.planId;
  // Never present the current public offer as an existing member's price.
  const displayedPlan = status?.canSubscribe === false && !planMatchesMembership ? null : plan;
  const annual = displayedPlan?.annualAmountMinor != null && displayedPlan.annualServiceFeeMinor != null
    ? { faceMinor: displayedPlan.annualAmountMinor, serviceFeeMinor: displayedPlan.annualServiceFeeMinor }
    : null;
  const displayedInterval = membership &&
    planMatchesMembership &&
    (status?.canSubscribe === false || membership.status === 'incomplete')
    ? membership.billingInterval
    : interval;
  const canJoin = Boolean(plan) && (!authenticated || status?.canSubscribe === true);
  const statusNotice = membership ? describeMembershipStanding(membership) : null;
  const planName = displayedPlan?.name ?? `${displayName} membership`;
  const paymentProblem = membership?.status === 'past_due' || membership?.status === 'unpaid';

  const manageButton = !page.viewer.isOwner && membership?.canManage ? (
    <Button
      variant={paymentProblem ? 'default' : 'outline'}
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
          Opening billing settings…
        </>
      ) : paymentProblem
        ? 'Update payment method'
        : 'Manage membership'}
    </Button>
  ) : null;

  const noticeBlock = (
    <>
      {statusNotice && (
        <output
          className={cn('mt-4 block text-sm', paymentProblem ? 'font-medium text-destructive' : 'text-muted-foreground')}
          data-testid="membership-standing"
        >
          {statusNotice}
        </output>
      )}
      {/* The outer guard keeps the notice out of the DOM when empty; tests count zero elements. */}
      {notice && (
        <StudioNotice testId="membership-notice" className="mt-4 px-3 py-2">{notice}</StudioNotice>
      )}
      {notice && noticeAction && (
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={noticeAction.onClick}>
          {noticeAction.label}
        </Button>
      )}
      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    </>
  );

  // The curator is the holder on every pass; the head is always brand red on the public page.
  const pass = {
    id: membershipId,
    'data-testid': 'curator-membership-card',
    product: 'Membership',
    holderName: displayName,
    holderHandle: page.curator.username,
    avatarUrl: page.curator.avatarUrl ?? undefined,
    active: true,
  } as const;

  // Entitled member: welcome, what they unlocked, and the billing they actually pay — no pitch.
  if (page.viewer.isMember) {
    return (
        <WalletPass
          ref={memberPassRef}
          {...pass}
          tier="Member"
          price={membership ? formatPaidPromotionMinorAmount(membership.totalAmountMinor, membership.currency) : undefined}
          priceUnit={membership ? `/${membership.billingInterval}` : undefined}
          validityLabel={membership?.paidThroughUtc ? (membership.cancelAtPeriodEnd ? 'Ends' : 'Renews') : 'Plan'}
          validityValue={membership?.paidThroughUtc ? formatMembershipDate(membership.paidThroughUtc) : planName}
        >
          {activated && (
            <h2 className="text-balance break-words font-teko text-2xl font-semibold uppercase leading-none">
              Welcome to {displayName}&apos;s membership
            </h2>
          )}
          {/* Standing first: what the member pays and any scheduled change, then the actions that answer it. */}
          {membership && (
            <p className={cn('text-sm tabular-nums text-muted-foreground', activated && 'mt-3')} data-testid="membership-billing">
              {describeMembershipBilling(membership)}
            </p>
          )}
          {noticeBlock}
          <div className="mt-5 space-y-2">
            <Button asChild className="w-full">
              <a href={`#${feedHeadingId}`} onClick={onViewMemberPosts} data-testid="membership-view-posts">
                View member posts
              </a>
            </Button>
            {manageButton}
          </div>
          {displayedPlan && <BenefitList benefits={displayedPlan.benefits} />}
          <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Membership links">
            <Link href="/memberships" className="underline underline-offset-4">My memberships</Link>
            {activated && (
              <Link href="/profile/edit" className="underline underline-offset-4">Set up your profile</Link>
            )}
          </nav>
        </WalletPass>
    );
  }

  return (
    <MembershipOffer
      id={membershipId}
      data-testid="curator-membership-card"
      tier={displayedInterval === 'year' ? 'Per year' : 'Per month'}
      curatorName={displayName}
      curatorHandle={page.curator.username}
      curatorAvatarUrl={page.curator.avatarUrl ?? undefined}
      name={planName}
      description={displayedPlan?.description ?? ''}
      benefits={displayedPlan?.benefits ?? []}
      monthly={displayedPlan ? { faceMinor: displayedPlan.amountMinor, serviceFeeMinor: displayedPlan.serviceFeeMinor } : null}
      annual={annual}
      currency={displayedPlan?.currency ?? 'USD'}
      interval={displayedInterval}
      controls={
        displayedPlan && annual && canJoin && !page.viewer.isOwner &&
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
          )
      }
    >
      <div className="mt-6 space-y-2">
        {page.viewer.isOwner ? (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-2.5 text-sm text-muted-foreground">
            <p>This is your published plan. Visitors see it like this.</p>
            <Link href="/studio/curator" className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline">
              Manage in Curator Studio
            </Link>
          </div>
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
        {membership?.canManage && (
          <p className="text-sm tabular-nums text-muted-foreground" data-testid="membership-billing">
            {describeMembershipBilling(membership)}
          </p>
        )}
        {membership?.canManage && (
          <Link href="/memberships" className="block text-sm underline underline-offset-4">
            My memberships
          </Link>
        )}
      </div>
      {noticeBlock}
    </MembershipOffer>
  );
}
