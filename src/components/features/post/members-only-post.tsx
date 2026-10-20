'use client';

import Link from 'next/link';
import { LockedPostCard } from '@/components/features/explore/explore-cards';
import { useMembershipPurchaseContext } from '@/components/features/auth/membership-purchase-summary';
import { CuratorFollowAction, CuratorFollowContext } from '@/components/features/curator/curator-follow-action';
import { useAuthState } from '@/hooks/use-auth';
import { useCuratorFollow } from '@/hooks/use-curator-follow';
import { formatCuratorPlanPrice } from '@/services/curator';
import { curatorMembershipHref } from '@/services/membership';
import { buildAuthPath } from '@/utils/auth-redirect';
import type { CuratorFeedItem } from '@/types';

export type LockedCuratorPost = Extract<CuratorFeedItem, { kind: 'locked' }>;

/** A shared members-only post the viewer has not joined. Bridge sends only the curator and the time. */
export function MembersOnlyPost({ item }: { item: LockedCuratorPost }) {
  const { curator } = item;
  const name = curator.displayName?.trim() || curator.username;
  const { isAuthenticated, isLoading } = useAuthState();
  // The offer is the curator's current public plan, never a value from the link.
  const offer = useMembershipPurchaseContext({ username: curator.username, interval: 'month' });
  const follow = useCuratorFollow({ id: curator.id, username: curator.username, displayName: name }, false, '');
  const plan = offer.data?.membership ?? null;
  let availability: 'available' | 'unavailable' | 'unknown' = 'unknown';
  if (offer.data) availability = plan ? 'available' : 'unavailable';

  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-12">
      <section aria-labelledby="members-only-post-title" className="w-full max-w-xs space-y-4" data-testid="members-only-post">
        <h1 id="members-only-post-title" className="sr-only">Members-only post from {name}</h1>
        <LockedPostCard
          item={item}
          availability={availability}
          joinHref={curatorMembershipHref(curator.username, item.postId)}
        />
        {plan && (
          <p className="text-center text-sm text-muted-foreground">
            Membership{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCuratorPlanPrice(plan.amountMinor, plan.serviceFeeMinor, plan.currency)}
            </span>{' '}
            a month
          </p>
        )}
        <CuratorFollowContext.Provider value={follow}>
          <CuratorFollowAction />
        </CuratorFollowContext.Provider>
        {!isLoading && !isAuthenticated && (
          <p className="text-center text-sm text-muted-foreground">
            Already a member?{' '}
            <Link
              href={buildAuthPath('/auth/signin', `/post/${encodeURIComponent(item.postId)}`)}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
