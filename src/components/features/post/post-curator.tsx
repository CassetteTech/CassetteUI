'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CuratorFollowAction, CuratorFollowContext } from '@/components/features/curator/curator-follow-action';
import { useCuratorFollow } from '@/hooks/use-curator-follow';
import { formatCuratorPlanPrice } from '@/services/curator';
import { curatorMembershipHref } from '@/services/membership';
import type { PostCurator } from '@/services/post-response';

type PostCuratorProps = { curator: PostCurator | undefined; postId: string; isOwner: boolean };

const postCuratorName = (curator: PostCurator) => curator.displayName?.trim() || curator.username;

function CuratorFollow({ curator, postId }: { curator: PostCurator; postId: string }) {
  const follow = useCuratorFollow(
    { id: curator.curatorProfileId, username: curator.username, displayName: postCuratorName(curator) },
    false,
    '',
    `/post/${encodeURIComponent(postId)}`,
    curator.viewerFollow,
  );
  return (
    <CuratorFollowContext.Provider value={follow}>
      <CuratorFollowAction compact showUnfollow={false} className="shrink-0" />
    </CuratorFollowContext.Provider>
  );
}

/**
 * The author row's name and Follow for the curator behind the post; a signed-out Follow comes back
 * to the post. A member has no Follow, as on the curator page.
 */
export function postCuratorHeader({ curator, postId, isOwner }: PostCuratorProps) {
  if (!curator) return {};
  return {
    displayName: postCuratorName(curator),
    action: isOwner || curator.viewerFollow?.hasActiveMembership
      ? undefined
      : <CuratorFollow curator={curator} postId={postId} />,
  };
}

/** Closes the author card: the curator's plan with Join, or the viewer's membership. */
export function PostCuratorJoin({ curator, postId, isOwner }: PostCuratorProps) {
  const membership = curator?.membership;
  if (!curator || !membership || isOwner) return null;

  const price = formatCuratorPlanPrice(membership.amountMinor, membership.serviceFeeMinor, membership.currency);
  const count = membership.membersOnlyPostCount;
  return (
    <div data-testid="post-curator-join" className="border-t border-border pt-3">
      {/* Both rows hold the plan row's two-line height, so the card keeps one size. */}
      <div className="flex min-h-9 items-center justify-between gap-3">
        {membership.viewerIsMember ? (
          <>
            <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-success-text">
              <Check aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">Member of {membership.planName}</span>
            </p>
            <Link
              href={`/profile/${encodeURIComponent(curator.username)}?filter=members`}
              className="shrink-0 rounded-sm text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Member posts
            </Link>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{membership.planName}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {price}/month{count > 0 && ` · ${count} members-only ${count === 1 ? 'post' : 'posts'}`}
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={curatorMembershipHref(curator.username, postId, true)}>
                Join<span className="sr-only"> {postCuratorName(curator)}</span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
