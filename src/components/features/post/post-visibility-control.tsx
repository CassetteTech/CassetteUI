'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { studioPaths } from '@/components/features/curator/studio-routes';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { Button } from '@/components/ui/button';
import {
  membersOptionOf,
  ownerVisibilities,
  postVisibility,
  visibilityOf,
  type OwnerVisibility,
} from '@/components/features/post/post-visibility';
import { useMemberPostAccess } from '@/hooks/use-curator';
import type { PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';

export function PostVisibilityControl({
  privacy,
  choose,
  disabled = false,
  headingAs: Heading = 'h3',
}: {
  privacy: PostPrivacy;
  choose: (next: OwnerVisibility) => void;
  disabled?: boolean;
  headingAs?: 'h2' | 'h3';
}) {
  const access = useMemberPostAccess();
  const { needsPlan, waiting } = membersOptionOf(access.state, privacy);
  const [setupShown, setSetupShown] = useState(false);
  const promptShown = needsPlan && setupShown && !disabled;
  const known = visibilityOf(privacy) !== undefined;
  return (
    <section>
      <Heading className="text-sm font-semibold">Who can open it</Heading>
      <SegmentedControl
        label="Post visibility"
        className="mt-3 w-full"
        value={privacy}
        onValueChange={(next) => {
          const value = ownerVisibilities.find((option) => option === next);
          const locked = value === 'subscriber' && needsPlan;
          setSetupShown(locked);
          if (value && !locked) choose(value);
        }}
        options={ownerVisibilities.map((value) => ({
          value,
          label: value === 'subscriber' ? 'Members' : postVisibility[value].label,
          icon: value === 'subscriber' && needsPlan
            ? <LockKeyhole aria-hidden className="mr-1 inline size-3 -translate-y-px" />
            : undefined,
          disabled: disabled || (value === 'subscriber' && waiting),
        }))}
      />
      <div className="mt-3 grid text-sm text-muted-foreground">
        {ownerVisibilities.map((value) => (
          <p
            key={value}
            aria-hidden={value !== privacy || promptShown}
            className={cn('col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none', (value !== privacy || promptShown) && 'invisible opacity-0')}
          >
            {postVisibility[value].summary}
          </p>
        ))}
        {!known && (
          <p
            aria-hidden={promptShown}
            className={cn('col-start-1 row-start-1', promptShown && 'invisible')}
          >
            This post uses an older setting. Choose who can open it.
          </p>
        )}
        {needsPlan && !disabled && (
          <div role="status" className="col-start-1 row-start-1">
            <p
              aria-hidden={!promptShown}
              className={cn('transition-opacity duration-200 motion-reduce:transition-none', !promptShown && 'invisible opacity-0')}
            >
              To lock posts, publish a membership plan with member posts.{' '}
              <Link href={studioPaths['studio-membership']} prefetch={false} className="font-medium text-foreground underline underline-offset-2">
                Set up memberships
              </Link>
            </p>
          </div>
        )}
      </div>
      {access.state === 'error' && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Could not check your membership plans.</p>
          <Button type="button" variant="outline" size="sm" onClick={access.refetch}>
            Try again
          </Button>
        </div>
      )}
    </section>
  );
}
