'use client';

/** Lists the signed-in fan's own memberships at their retained prices, with curator and billing links. */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import {
  describeMembershipBilling,
  describeMembershipStanding,
  type MyMembership,
} from '@/services/membership';

function MembershipRow({ entry }: { entry: MyMembership }) {
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { membership } = entry;
  const standing = describeMembershipStanding(membership);
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
    <Card data-testid="my-membership" className="elev-1">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/profile/${encodeURIComponent(entry.curatorUsername)}`}
            className="break-words text-lg font-semibold underline-offset-4 hover:underline"
          >
            {curatorName}
          </Link>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground" data-testid="my-membership-billing">
            {describeMembershipBilling(membership)}
          </p>
          {standing && (
            <p className="mt-2 text-sm text-muted-foreground" data-testid="my-membership-standing">{standing}</p>
          )}
          {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
        </div>
        {membership.canManage && (
          <Button
            variant={paymentProblem ? 'default' : 'outline'}
            className="shrink-0"
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
      </CardContent>
    </Card>
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <h1 className="text-balance font-teko text-4xl font-bold uppercase">My memberships</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Prices shown are what you pay for each membership; tax is added where applicable.
      </p>
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
