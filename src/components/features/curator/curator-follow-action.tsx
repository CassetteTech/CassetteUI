'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { CuratorFollow } from '@/hooks/use-curator-follow';
import { CarriedActionConfirmation } from '@/components/features/curator/carried-action-confirmation';
import { cn } from '@/lib/utils';

export const CuratorFollowContext = createContext<CuratorFollow | null>(null);

export function CuratorFollowAction({
  className,
  compact = false,
  showUnfollow = true,
}: {
  className?: string;
  compact?: boolean;
  /** False shows a followed curator as "Following" only; Unfollow stays on the curator page. */
  showUnfollow?: boolean;
}) {
  const follow = useContext(CuratorFollowContext);
  const followedHere = useRef(false);
  const followingLabel = useRef<HTMLParagraphElement>(null);
  const following = follow?.state === 'following';
  // The Follow button leaves when it succeeds, so its focus moves to the label that replaces it.
  useEffect(() => {
    if (!following || !followedHere.current) return;
    followedHere.current = false;
    if (!showUnfollow) followingLabel.current?.focus();
  }, [following, showUnfollow]);
  if (!follow || follow.state === 'loading' || follow.state === 'member') return null;

  const name = <span className="sr-only"> {follow.displayName}</span>;
  let control;
  if (follow.state === 'unavailable') {
    control = (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-sm text-muted-foreground">Follow status is unavailable.</p>
        <Button variant="outline" size="sm" onClick={follow.retry}>Try again</Button>
      </div>
    );
  } else {
    control = (
      <div className={cn('flex items-center gap-3', !compact && 'justify-between')}>
        {following && (
          <p ref={followingLabel} tabIndex={-1} className="flex items-center gap-1.5 text-sm font-medium focus-visible:outline-none">
            <Check className="size-4" aria-hidden />
            Following
          </p>
        )}
        {(showUnfollow || !following) && (
          <Button
            variant="outline"
            size={following || compact ? 'sm' : 'default'}
            className={cn(!following && !compact && 'w-full')}
            onClick={() => {
              if (following) {
                follow.unfollow();
                return;
              }
              followedHere.current = true;
              follow.follow();
            }}
            busy={follow.pending}
          >
            {follow.pending ? <Spinner size="sm" aria-hidden /> : !following && <UserPlus aria-hidden />}
            {following ? 'Unfollow' : 'Follow'}
            {name}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', className)} data-testid="curator-follow">
      {control}
      {follow.error && <p role="alert" className="mt-2 text-sm text-destructive">{follow.error}</p>}
    </div>
  );
}

export function CuratorFollowConfirmation() {
  const follow = useContext(CuratorFollowContext);
  if (!follow) return null;
  return (
    <CarriedActionConfirmation
      open={follow.confirming}
      onDismiss={follow.dismissConfirmation}
      onConfirm={follow.confirm}
      title={`Follow ${follow.displayName}?`}
      description="Their new posts will show in your Feed. You can unfollow at any time."
      confirmLabel="Follow"
      returnFocusSelector='[data-testid="curator-follow"] button'
    />
  );
}
