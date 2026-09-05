'use client';

/** Lists the signed-in fan's own memberships at their retained prices, with curator and billing links. */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { StudioChip, type StudioChipTone } from '@/components/features/curator/studio-shell';
import { DitherAvatar } from '@/components/dither-kit/avatar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  grantsMembershipAccess,
  type MembershipSubscription,
  type MyMembership,
} from '@/services/membership';
import { cn } from '@/lib/utils';

type StandingChip = { label: string; tone: StudioChipTone };

/** Cassette red; the pattern still varies per curator, the color stays on brand. */
const brandHue = 350;

function standingChip(membership: MembershipSubscription): StandingChip {
  switch (membership.status) {
    case 'past_due':
    case 'unpaid':
      return { label: 'Payment needed', tone: 'danger' };
    case 'paused':
      return { label: 'Paused', tone: 'warning' };
    case 'canceled':
      return { label: 'Canceled', tone: 'neutral' };
    default:
      if (membership.cancelAtPeriodEnd) return { label: 'Ending', tone: 'warning' };
      return grantsMembershipAccess(membership.status)
        ? { label: 'Active', tone: 'positive' }
        : { label: 'Pending', tone: 'neutral' };
  }
}

function MembershipRow({ entry }: { entry: MyMembership }) {
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { membership } = entry;
  const standing = describeMembershipStanding(membership);
  const chip = standingChip(membership);
  const paymentProblem = membership.status === 'past_due' || membership.status === 'unpaid';
  const curatorName = entry.curatorDisplayName.trim() || entry.curatorUsername;

  async function manage() {
    setPortalPending(true);
    setError(null);
    try {
      const portal = await apiService.createMembershipPortal(membership.membershipSubscriptionId);
      window.location.assign(portal.portalUrl);
    } catch {
      setError('We could not open billing settings. Try again.');
      setPortalPending(false);
    }
  }

  return (
    <article
      data-testid="my-membership"
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border bg-card p-4 elev-soft sm:flex-row sm:items-start sm:p-5',
        membership.status === 'canceled' && 'opacity-80',
      )}
    >
      {/* Curators have no avatar in this payload; a name-seeded dither mark stays stable per curator. */}
      <DitherAvatar name={entry.curatorUsername} hue={brandHue} size={44} className="shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            href={`/profile/${encodeURIComponent(entry.curatorUsername)}`}
            className="break-words text-base font-semibold leading-tight underline-offset-4 hover:underline"
          >
            {curatorName}
          </Link>
          <StudioChip tone={chip.tone}>{chip.label}</StudioChip>
        </div>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground" data-testid="my-membership-billing">
          {describeMembershipBilling(membership)}
        </p>
        {standing && (
          <p
            className={cn('mt-2 text-sm', paymentProblem ? 'text-destructive' : 'text-muted-foreground')}
            data-testid="my-membership-standing"
          >
            {standing}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
      </div>
      {membership.canManage && (
        <Button
          variant={paymentProblem ? 'default' : 'outline'}
          size="sm"
          className="w-full shrink-0 sm:w-auto"
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
    </article>
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
  const activeCount = query.data?.filter((entry) => grantsMembershipAccess(entry.membership.status)).length ?? 0;

  return (
    <div className="studio-surface mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
            My memberships
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The price shown is what you pay for each membership. Tax is added where it applies.
          </p>
        </div>
        {query.data && query.data.length > 0 && (
          <p className="text-sm tabular-nums text-muted-foreground">
            {activeCount} active of {query.data.length}
          </p>
        )}
      </header>
      <div className="mt-6 grid gap-3">
        {query.isPending ? (
          <>
            <output className="sr-only">Loading memberships…</output>
            <Skeleton className="h-24 w-full rounded-xl" aria-hidden />
            <Skeleton className="h-24 w-full rounded-xl" aria-hidden />
          </>
        ) : query.isError ? (
          <Empty>
            <EmptyTitle>Could not load memberships</EmptyTitle>
            <EmptyDescription>Try again in a moment.</EmptyDescription>
            <Button onClick={() => void query.refetch()} className="mt-3">Try again</Button>
          </Empty>
        ) : query.data.length === 0 ? (
          <Empty data-testid="my-memberships-empty">
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
            <MembershipRow key={entry.membership.membershipSubscriptionId} entry={entry} />
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
