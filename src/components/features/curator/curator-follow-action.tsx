'use client';

import { createContext, useContext } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { CuratorFollow } from '@/hooks/use-curator-follow';
import { CarriedActionConfirmation } from '@/components/features/curator/carried-action-confirmation';
import { cn } from '@/lib/utils';

export const CuratorFollowContext = createContext<CuratorFollow | null>(null);

export function CuratorFollowAction({ className, compact = false }: { className?: string; compact?: boolean }) {
  const follow = useContext(CuratorFollowContext);
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
    const following = follow.state === 'following';
    control = (
      <div className={cn('flex items-center gap-3', !compact && 'justify-between')}>
        {following && (
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Check className="size-4" aria-hidden />
            Following
          </p>
        )}
        <Button
          variant="outline"
          size={following || compact ? 'sm' : 'default'}
          className={cn(!following && !compact && 'w-full')}
          onClick={following ? follow.unfollow : follow.follow}
          busy={follow.pending}
        >
          {follow.pending ? <Spinner size="sm" aria-hidden /> : !following && <UserPlus aria-hidden />}
          {following ? 'Unfollow' : 'Follow'}
          {name}
        </Button>
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
