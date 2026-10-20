'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import type { CuratorPage } from '@/services/curator';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  formatMembershipDate,
  membershipDateLabel,
  membershipEndOrRenewalUtc,
  membershipPhase,
  type MembershipInterval,
  type MembershipStatusView,
  type MembershipSubscription,
} from '@/services/membership';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { BenefitList, MembershipOffer } from '@/components/features/membership/membership-offer';
import { WalletPass } from '@/components/features/curator/wallet-pass';
import { StudioNotice } from '@/components/features/curator/studio-shell';
import { CuratorFollowAction } from '@/components/features/curator/curator-follow-action';
import { PostLink } from '@/components/features/post/post-link';
import { useScrollToHashTarget } from '@/hooks/use-scroll-to-hash-target';
import { useSharedPosition } from '@/hooks/use-shared-position';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { cn } from '@/lib/utils';

export { MEMBERSHIP_OFFER_ID } from '@/services/membership';

export const membershipPassPositionKey = (username: string) => `membership-pass:${username}`;

/** A members-only post the new member can open, for the "You're in" list. */
export type UnlockedPost = {
  postId: string;
  title: string;
  elementType: string;
  imageUrl: string | null;
  createdAt: string;
};

const inkFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground';
const headingFocus = cn('rounded-sm focus:outline-none', inkFocus);

/**
 * The curator's membership pass. Phones get a plain card above the posts; the desktop rail keeps
 * the wallet pass. Both render, and CSS shows one, so no layout waits on script.
 */
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
  confirming,
  unlockedPosts,
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
  summary,
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
  /** Back from Checkout and still polling for the membership. */
  confirming: boolean;
  unlockedPosts: UnlockedPost[] | null;
  notice: string | null;
  error: string | null;
  checkoutPending: boolean;
  portalPending: boolean;
  checkoutCanceled: boolean;
  noticeAction: { label: string; onClick: () => void } | null;
  onIntervalChange: (interval: MembershipInterval) => void;
  onJoin: () => void;
  onManage: (membership: MembershipSubscription) => void;
  onCheckStatus: () => void;
  onViewMemberPosts: () => void;
  summary?: ReactNode;
}) {
  const plan = page.membership;
  const membership = status?.membership;
  const memberPassRef = useRef<HTMLDivElement>(null);
  const phoneCardRef = useRef<HTMLDivElement>(null);
  const phoneHeadingRef = useRef<HTMLHeadingElement>(null);
  const desktopHeadingRef = useRef<HTMLHeadingElement>(null);
  useSharedPosition(memberPassRef, membershipPassPositionKey(page.curator.username));
  useScrollToHashTarget(membershipId);
  const planMatchesMembership = !membership || membership.planId === plan?.planId;
  const displayedPlan = status?.canSubscribe === false && !planMatchesMembership ? null : plan;
  const annual = displayedPlan?.annualAmountMinor != null && displayedPlan.annualServiceFeeMinor != null
    ? { faceMinor: displayedPlan.annualAmountMinor, serviceFeeMinor: displayedPlan.annualServiceFeeMinor }
    : null;
  const monthly = displayedPlan ? { faceMinor: displayedPlan.amountMinor, serviceFeeMinor: displayedPlan.serviceFeeMinor } : null;
  const displayedInterval = membership &&
    planMatchesMembership &&
    (status?.canSubscribe === false || membership.status === 'incomplete')
    ? membership.billingInterval
    : interval;
  const canJoin = Boolean(plan) && (!authenticated || status?.canSubscribe === true);
  const statusNotice = membership ? describeMembershipStanding(membership) : null;
  const memberEndUtc = membership ? membershipEndOrRenewalUtc(membership) : null;
  const phase = membership ? membershipPhase(membership) : null;
  const planName = displayedPlan?.name ?? `${displayName} membership`;
  const paymentProblem = phase === 'payment-problem';
  const isMember = page.viewer.isMember;
  const memberPostCount = plan?.membersOnlyPostCount ?? 0;
  // Payment is not confirmed: polling after Checkout, settled but the page not yet reread, or a
  // Checkout that Stripe still holds as incomplete.
  const pending = !isMember && !page.viewer.isOwner &&
    (confirming || activated || (membership?.status === 'incomplete' && !canJoin));
  const welcome = activated && isMember;
  const arrival = welcome ? 'welcome' : pending && (confirming || activated) ? 'pending' : null;

  // After Checkout, the visible pass comes into view and its heading takes focus.
  useEffect(() => {
    if (!arrival) return;
    const phoneHeading = phoneHeadingRef.current;
    if (phoneHeading && phoneHeading.getClientRects().length > 0) {
      phoneCardRef.current?.scrollIntoView({ block: 'start' });
      phoneHeading.focus({ preventScroll: true });
    } else {
      desktopHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [arrival]);

  const manageButton = (phone: boolean, label = paymentProblem ? 'Update payment method' : 'Manage membership') =>
    !page.viewer.isOwner && membership?.canManage ? (
      <Button
        variant={paymentProblem ? 'default' : 'outline'}
        className="w-full"
        onClick={() => onManage(membership)}
        disabled={portalPending}
        data-testid={phone ? undefined : 'membership-manage'}
      >
        {portalPending ? (
          <>
            <Spinner size="sm" />
            Opening billing settings…
          </>
        ) : label}
      </Button>
    ) : null;

  // The phone copy carries no test ids: the desktop pass owns them, and both are in the document.
  const noticeBlock = (phone: boolean) => (
    <>
      {statusNotice && (
        <output
          className={cn('mt-4 block text-sm', paymentProblem ? 'font-medium text-destructive' : 'text-muted-foreground')}
          data-testid={phone ? undefined : 'membership-standing'}
        >
          {statusNotice}
        </output>
      )}
      {notice && !(phone && welcome) && (
        <StudioNotice testId={phone ? undefined : 'membership-notice'} className="mt-4 px-3 py-2">{notice}</StudioNotice>
      )}
      {notice && noticeAction && (
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={noticeAction.onClick}>
          {noticeAction.label}
        </Button>
      )}
      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    </>
  );

  const viewPostsLabel = welcome && memberPostCount > 1 ? `View all ${memberPostCount} member posts` : 'View member posts';
  const viewPostsButton = (phone: boolean) => (
    <Button asChild className="w-full">
      <a href={`#${feedHeadingId}`} onClick={onViewMemberPosts} data-testid={phone ? undefined : 'membership-view-posts'}>
        {phone && !welcome ? 'View member posts' : viewPostsLabel}
      </a>
    </Button>
  );

  const membershipLinks = (
    <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Membership links">
      <Link href="/memberships" className="underline underline-offset-4">Memberships</Link>
      {activated && (
        <Link href="/profile/edit" className="underline underline-offset-4">Set up your profile</Link>
      )}
    </nav>
  );

  const pendingBlock = (headingRef: RefObject<HTMLHeadingElement | null>) => (
    <ConfirmingPayment
      headingRef={headingRef}
      polling={confirming}
      memberPostCount={memberPostCount}
      onCheckStatus={onCheckStatus}
    />
  );

  const gross = (price: { faceMinor: number; serviceFeeMinor: number }) =>
    formatPaidPromotionMinorAmount(price.faceMinor + price.serviceFeeMinor, displayedPlan?.currency ?? 'USD');
  const selectedPrice = displayedInterval === 'year' ? annual : monthly;
  const otherPrice = displayedInterval === 'year' ? monthly : annual;
  const showIntervalControls = Boolean(displayedPlan && annual && (canJoin || page.viewer.isOwner) &&
    !(membership?.status === 'incomplete' && planMatchesMembership));
  const intervalControls = showIntervalControls && (
    <RadioGroup
      value={interval}
      onValueChange={(value) => onIntervalChange(value === 'year' ? 'year' : 'month')}
      aria-label="Billing interval"
      className="mt-5 grid grid-cols-2 gap-2"
    >
      {(['month', 'year'] as const).map((option) => (
        <label
          key={option}
          className={cn(
            'flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-center text-sm transition-colors hover:border-foreground/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
            interval === option && 'border-foreground bg-foreground/5 font-semibold hover:border-foreground',
          )}
        >
          <RadioGroupItem value={option} className="sr-only" data-testid={`membership-interval-${option}`} />
          {option === 'month' ? 'Monthly' : 'Annual'}
        </label>
      ))}
    </RadioGroup>
  );

  const phone = isMember ? (
    <PlainPass ref={phoneCardRef}>
      {welcome ? (
        <>
          <YoureIn
            headingRef={phoneHeadingRef}
            displayName={displayName}
            memberPostCount={memberPostCount}
            posts={unlockedPosts}
          />
          {noticeBlock(true)}
          <div className="mt-5 space-y-2">
            {viewPostsButton(true)}
            {manageButton(true)}
          </div>
          {membershipLinks}
        </>
      ) : (
        <>
          <PlanLine name={planName}>
            {membership ? describeMembershipBilling(membership) : `${memberPostCount} members-only posts`}
          </PlanLine>
          {noticeBlock(true)}
          <div className={cn('mt-4 grid gap-2', membership?.canManage && !page.viewer.isOwner && 'grid-cols-2')}>
            {viewPostsButton(true)}
            {manageButton(true, paymentProblem ? 'Update payment' : 'Manage')}
          </div>
          {displayedPlan && displayedPlan.benefits.length > 0 && (
            <PlanDetails>
              <BenefitList benefits={displayedPlan.benefits} />
            </PlanDetails>
          )}
        </>
      )}
    </PlainPass>
  ) : (
    <PlainPass ref={phoneCardRef}>
      {pending ? (
        <>
          <PlanLine name={planName} />
          <div className="mt-4">{pendingBlock(phoneHeadingRef)}</div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <PlanLine name={planName} className="flex-1">
            {selectedPrice && `${gross(selectedPrice)}/${displayedInterval}`}
            {memberPostCount > 0 && ` · ${memberPostCount} member ${memberPostCount === 1 ? 'post' : 'posts'}`}
          </PlanLine>
          {page.viewer.isOwner ? (
            <Button type="button" aria-disabled="true" tabIndex={-1} className="pointer-events-none shrink-0">
              Join
            </Button>
          ) : canJoin && !(statusLoading && authenticated) && !(statusUnavailable && authenticated) && (
            <Button className="shrink-0" onClick={onJoin} busy={checkoutPending} data-testid="membership-compact-join">
              {checkoutPending && <Spinner size="sm" />}
              {checkoutCanceled && membership?.status === 'incomplete' ? 'Retry' : 'Join'}
              <span className="sr-only"> {displayName}</span>
            </Button>
          )}
        </div>
      )}
      {!page.viewer.isOwner && !pending && statusLoading && authenticated && (
        <p className="mt-3 text-sm text-muted-foreground">Checking membership…</p>
      )}
      {!page.viewer.isOwner && !pending && !statusLoading && statusUnavailable && authenticated && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">Membership status is temporarily unavailable.</p>
          <Button variant="outline" className="w-full" onClick={onCheckStatus}>Try again</Button>
        </div>
      )}
      {membership?.canManage && (
        <div className="mt-4 space-y-2">
          {manageButton(true)}
          <p className="text-sm tabular-nums text-muted-foreground">{describeMembershipBilling(membership)}</p>
        </div>
      )}
      {noticeBlock(true)}
      {displayedPlan && !pending && (
        <PlanDetails>
          {displayedPlan.description.trim() && (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {displayedPlan.description}
            </p>
          )}
          {intervalControls}
          {selectedPrice && (
            <p className="mt-3 text-xs tabular-nums text-muted-foreground">
              Plus applicable tax
              {otherPrice && ` · or ${gross(otherPrice)}/${displayedInterval === 'year' ? 'month' : 'year'}`}
            </p>
          )}
          <BenefitList benefits={displayedPlan.benefits} />
          {canJoin && !authenticated && (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              You will be asked to sign in or create a free account first.
            </p>
          )}
          {membership?.canManage && (
            <Link href="/memberships" className="mt-4 block text-sm underline underline-offset-4">
              Memberships
            </Link>
          )}
        </PlanDetails>
      )}
    </PlainPass>
  );

  const pass = {
    'data-testid': 'curator-membership-card',
    product: 'Membership',
    holderName: displayName,
    holderHandle: page.curator.username,
    avatarUrl: page.curator.avatarUrl ?? undefined,
    active: true,
  } as const;

  const desktop = isMember ? (
    <WalletPass
      ref={memberPassRef}
      {...pass}
      summary={summary}
      tier="Member"
      price={membership ? formatPaidPromotionMinorAmount(membership.totalAmountMinor, membership.currency) : undefined}
      priceUnit={membership ? `/${membership.billingInterval}` : undefined}
      validityLabel={!memberEndUtc || !membership ? 'Plan' : membershipDateLabel(membership)}
      validityValue={memberEndUtc ? formatMembershipDate(memberEndUtc) : planName}
    >
      {welcome && (
        <YoureIn
          headingRef={desktopHeadingRef}
          displayName={displayName}
          memberPostCount={memberPostCount}
          posts={unlockedPosts}
        />
      )}
      {membership && (
        <p className={cn('text-sm tabular-nums text-muted-foreground', welcome && 'mt-4')} data-testid="membership-billing">
          {describeMembershipBilling(membership)}
        </p>
      )}
      {noticeBlock(false)}
      <div className="mt-5 space-y-2">
        {viewPostsButton(false)}
        {manageButton(false)}
      </div>
      {displayedPlan && <BenefitList benefits={displayedPlan.benefits} />}
      {membershipLinks}
    </WalletPass>
  ) : (
    <MembershipOffer
      data-testid="curator-membership-card"
      tier={displayedInterval === 'year' ? 'Per year' : 'Per month'}
      curatorName={displayName}
      curatorHandle={page.curator.username}
      curatorAvatarUrl={page.curator.avatarUrl ?? undefined}
      name={planName}
      description={displayedPlan?.description ?? ''}
      benefits={displayedPlan?.benefits ?? []}
      monthly={monthly}
      annual={annual}
      currency={displayedPlan?.currency ?? 'USD'}
      interval={displayedInterval}
      summary={summary}
      controls={intervalControls}
    >
      <div className="mt-6 space-y-2">
        {page.viewer.isOwner ? (
          /* The owner previews the pass as a visitor sees it: Join stands in, inert, like the
             Studio preview's; the plan is managed in Studio, which the preview strip opens. */
          <Button
            type="button"
            aria-disabled="true"
            tabIndex={-1}
            className="pointer-events-none w-full"
            data-testid="membership-join-preview"
          >
            Join {displayName}
          </Button>
        ) : pending ? (
          pendingBlock(desktopHeadingRef)
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
              busy={checkoutPending}
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
        ) : null}

        <CuratorFollowAction className="hidden lg:block" />
        {manageButton(false)}
        {membership?.canManage && (
          <p className="text-sm tabular-nums text-muted-foreground" data-testid="membership-billing">
            {describeMembershipBilling(membership)}
          </p>
        )}
        {membership?.canManage && (
          <Link href="/memberships" className="block text-sm underline underline-offset-4">
            Memberships
          </Link>
        )}
      </div>
      {noticeBlock(false)}
    </MembershipOffer>
  );

  return (
    <div id={membershipId}>
      <div className="lg:hidden">{phone}</div>
      <div className="hidden lg:block">{desktop}</div>
    </div>
  );
}

function PlainPass({ ref, children }: { ref: RefObject<HTMLDivElement | null>; children: ReactNode }) {
  return (
    <div ref={ref} className="card-quiet scroll-mt-32 p-4" data-testid="curator-membership-compact">
      {children}
    </div>
  );
}

function PlanLine({ name, className, children }: { name: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate font-semibold leading-snug">{name}</p>
      {children && <p className="text-sm tabular-nums leading-snug text-muted-foreground">{children}</p>}
    </div>
  );
}

function PlanDetails({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="-mx-4 -mb-4 mt-4 border-t border-border/70">
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-b-xl px-4 text-left text-sm font-medium focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground">
        Plan details
        <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function YoureIn({
  headingRef,
  displayName,
  memberPostCount,
  posts,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  displayName: string;
  memberPostCount: number;
  posts: UnlockedPost[] | null;
}) {
  const newest = (posts ?? []).slice(0, 3);
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className={cn('text-xl font-semibold leading-tight', headingFocus)}>
        You&apos;re in
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground [text-wrap:pretty]">
        Welcome to {displayName}&apos;s membership.
        {memberPostCount > 0 && (memberPostCount === 1
          ? ' 1 members-only post is open to you.'
          : ` ${memberPostCount} members-only posts are open to you.`)}
      </p>
      {newest.length > 0 && (
        <ul className="mt-3 divide-y divide-border/70" aria-label="Newest members-only posts">
          {newest.map((post) => (
            <li key={post.postId}>
              <PostLink
                href={`/post/${post.postId}`}
                className={cn('group flex items-center gap-3 rounded-md py-2 focus:outline-none', inkFocus)}
              >
                <ArtworkImage
                  src={post.imageUrl ?? undefined}
                  alt=""
                  width={80}
                  height={80}
                  className="size-10 shrink-0 rounded object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                  fallbackClassName="size-10 shrink-0 rounded bg-muted/60"
                  fallbackIconClassName="size-4 text-muted-foreground/50"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium underline-offset-2 group-hover:underline">{post.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {post.elementType} · {formatRelativeTime(post.createdAt)}
                  </span>
                </span>
              </PostLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfirmingPayment({
  headingRef,
  polling,
  memberPostCount,
  onCheckStatus,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  polling: boolean;
  memberPostCount: number;
  onCheckStatus: () => void;
}) {
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className={cn('flex items-center gap-2 text-base font-semibold', headingFocus)}>
        {polling && <Spinner size="sm" aria-hidden />}
        Confirming your payment
      </h2>
      <p className="mt-1 text-sm text-muted-foreground [text-wrap:pretty]">
        This usually takes a few seconds.{' '}
        {memberPostCount > 0
          ? `Your ${memberPostCount} member ${memberPostCount === 1 ? 'post opens' : 'posts open'} here when it is done.`
          : 'Your membership opens here when it is done.'}
      </p>
      <Button variant="outline" className="mt-4 w-full" onClick={onCheckStatus}>
        Check status
      </Button>
    </div>
  );
}
