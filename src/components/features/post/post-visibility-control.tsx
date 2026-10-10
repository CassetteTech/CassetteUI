'use client';

/** The owner's "Who can open it" control, shared by the post page and Add Music so a
    post's visibility is chosen the same way before and after it is published. */

import { useState } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { Button } from '@/components/ui/button';
import {
  ownerVisibilities,
  postVisibility,
  visibilityOf,
  type OwnerVisibility,
} from '@/components/features/post/post-visibility';
import { useMemberPostAccess } from '@/hooks/use-curator';
import type { PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';

/** Three positions with the chosen one's summary beneath. Every summary sits in the same
    grid cell and only the chosen one shows, so the cell keeps the tallest summary's height
    and switching never moves what follows. */
export function PostVisibilityControl({
  privacy,
  choose,
  disabled = false,
  headingAs: Heading = 'h3',
}: {
  privacy: PostPrivacy;
  choose: (next: OwnerVisibility) => void;
  /** Holds every option, and hides the setup prompt, while the caller cannot take a change. */
  disabled?: boolean;
  /** The level that fits the caller's outline: h3 under the post panel's h2, h2 under a page's h1. */
  headingAs?: 'h2' | 'h3';
}) {
  const access = useMemberPostAccess();
  const canLock = access.state === 'ready' || privacy === 'subscriber';
  // Without a plan that unlocks member posts, "Members" carries a lock. Choosing it keeps the
  // post's setting and shows where plans are set up instead.
  const needsPlan = !canLock && access.state === 'needs-plan';
  const [setupShown, setSetupShown] = useState(false);
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
          // The post page's headline says "Members only"; the short label keeps the three segments even.
          label: value === 'subscriber' ? 'Members' : postVisibility[value].label,
          icon: value === 'subscriber' && needsPlan
            ? <LockKeyhole aria-hidden className="mr-1 inline size-3 -translate-y-px" />
            : undefined,
          // While the plan check loads or fails, the option waits; the error row below offers a retry.
          disabled: disabled || (value === 'subscriber' && !canLock && !needsPlan),
        }))}
      />
      <div className="mt-3 grid text-sm text-muted-foreground">
        {ownerVisibilities.map((value) => (
          <p
            key={value}
            aria-hidden={value !== privacy}
            className={cn('col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none', value !== privacy && 'invisible opacity-0')}
          >
            {postVisibility[value].summary}
          </p>
        ))}
        {!known && (
          <p className="col-start-1 row-start-1">This post uses an older setting. Choose who can open it.</p>
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
      {/* Plans live in Curator Studio; the post only points there. A live region, so the prompt
          is announced when the locked option is chosen. */}
      <div role="status">
        {needsPlan && setupShown && !disabled && (
          <div className="mt-3 rounded-lg bg-muted/60 p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
            <p className="text-sm text-muted-foreground">To lock posts, publish a membership plan with member posts.</p>
            <Button asChild size="sm" className="mt-2.5">
              <Link href="/studio/curator" prefetch={false}>Set up memberships</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
