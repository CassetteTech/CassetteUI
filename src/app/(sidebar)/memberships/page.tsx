'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { WalletPass } from '@/components/features/curator/wallet-pass';
import { membershipPassPositionKey } from '@/components/features/curator/curator-membership-card';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { useSharedPosition } from '@/hooks/use-shared-position';
import { apiService } from '@/services/api';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  formatMembershipDate,
  hasMembershipAccess,
  membershipDateLabel,
  membershipEndOrRenewalUtc,
  membershipPhase,
  rememberMembershipPortalBaseline,
  type MembershipPhase,
  type MyMembership,
} from '@/services/membership';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { cn } from '@/lib/utils';

const tier = {
  ended: 'Ended',
  ending: 'Ending',
  'payment-problem': 'Payment needed',
  paused: 'Paused',
  renewing: 'Member',
  pending: 'Pending',
} satisfies Record<MembershipPhase, string>;

function MembershipPass({ entry }: { entry: MyMembership }) {
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { membership } = entry;
  const phase = membershipPhase(membership);
  const standing = describeMembershipStanding(membership);
  const paymentProblem = phase === 'payment-problem';
  const curatorName = entry.curatorDisplayName.trim() || entry.curatorUsername;
  const money = (minor: number) => formatPaidPromotionMinorAmount(minor, membership.currency);
  const endUtc = membershipEndOrRenewalUtc(membership);
  const end = endUtc ? formatMembershipDate(endUtc) : null;
  const passRef = useRef<HTMLDivElement>(null);
  useSharedPosition(passRef, membershipPassPositionKey(entry.curatorUsername));

  async function manage() {
    setPortalPending(true);
    setError(null);
    try {
      const portal = await apiService.createMembershipPortal(membership.membershipSubscriptionId);
      rememberMembershipPortalBaseline(membership);
      window.location.assign(portal.portalUrl);
    } catch {
      setError('We could not open billing settings. Try again.');
      setPortalPending(false);
    }
  }

  return (
    <WalletPass
      ref={passRef}
      data-testid="my-membership"
      className={cn(phase === 'ended' && 'opacity-80')}
      product="Membership"
      tier={tier[phase]}
      holderName={curatorName}
      holderHandle={entry.curatorUsername}
      holderHref={`/profile/${encodeURIComponent(entry.curatorUsername)}`}
      active={phase !== 'ended'}
      validityLabel={end ? membershipDateLabel(membership) : 'Status'}
      validityValue={end ?? tier[phase]}
    >
      {standing && (
        <p
          className={cn('text-sm', paymentProblem ? 'font-medium text-destructive' : 'text-muted-foreground')}
          data-testid="my-membership-standing"
        >
          {standing}
        </p>
      )}
      <details className={cn('group relative z-20', standing && 'mt-3')} open={paymentProblem || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
          Billing
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-2 space-y-1 text-sm tabular-nums text-muted-foreground">
          <div className="flex justify-between gap-3">
            <dt>Membership</dt>
            <dd>{money(membership.faceAmountMinor)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Service fee</dt>
            <dd>{money(membership.serviceFeeMinor)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm tabular-nums text-muted-foreground" data-testid="my-membership-billing">
          {describeMembershipBilling(membership)}
        </p>
        {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
        {membership.canManage && (
          <Button
            variant={paymentProblem ? 'default' : 'outline'}
            size="sm"
            className="mt-3 w-full"
            onClick={() => void manage()}
            disabled={portalPending}
            data-testid="my-membership-manage"
          >
            {portalPending ? (
              <>
                <Spinner size="sm" />
                Opening billing settings…
              </>
            ) : paymentProblem ? 'Update payment method' : 'Manage membership'}
          </Button>
        )}
      </details>
    </WalletPass>
  );
}

function MyMemberships() {
  const { user } = useAuthState();
  const query = useQuery({
    queryKey: ['my-memberships', user?.id ?? null],
    queryFn: ({ signal }) => apiService.getMyMemberships(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
    retry: 1,
  });
  const activeCount = query.data?.filter((entry) => hasMembershipAccess(entry.membership)).length ?? 0;
  const empty = query.data?.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100svh-var(--navbar-height))] w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:min-h-full lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
            Memberships
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {empty ? 'The curators you support.' : 'The curators you support. Open a pass to visit their page.'}
          </p>
        </div>
        {query.data && query.data.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-teko text-3xl font-bold leading-none tabular-nums text-foreground">{activeCount}</span>
            {' '}active of {query.data.length}
          </p>
        )}
      </header>
      <div className={cn('mt-6 grid gap-4 sm:grid-cols-2 sm:items-start', empty && 'flex-1')}>
        {query.isPending ? (
          <>
            <output className="sr-only">Loading memberships…</output>
            <Skeleton className="h-52 w-full rounded-lg" aria-hidden />
            <Skeleton className="h-52 w-full rounded-lg" aria-hidden />
          </>
        ) : query.isError ? (
          <Empty className="sm:col-span-2">
            <EmptyTitle>Could not load memberships</EmptyTitle>
            <EmptyDescription>Try again in a moment.</EmptyDescription>
            <Button onClick={() => void query.refetch()} className="mt-3">Try again</Button>
          </Empty>
        ) : query.data.length === 0 ? (
          <Empty className="border-none pb-24 sm:col-span-2 sm:self-stretch" data-testid="my-memberships-empty">
            <EmptyTitle>No memberships yet</EmptyTitle>
            <EmptyDescription>
              Join a curator to unlock members-only posts. Your memberships will show up here.
            </EmptyDescription>
            <Button asChild variant="outline" className="mt-3">
              <Link href="/explore">Explore curators</Link>
            </Button>
          </Empty>
        ) : (
          query.data.map((entry) => (
            <MembershipPass key={entry.membership.membershipSubscriptionId} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

export default function MyMembershipsPage() {
  return (
    <RequireAuth>
      <MyMemberships />
    </RequireAuth>
  );
}
