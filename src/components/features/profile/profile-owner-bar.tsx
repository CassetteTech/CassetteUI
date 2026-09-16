'use client';

/** Owner-only strip on the public profile: says the page is public, and offers
    the link, the editor, and Curator Studio without leaving the page. */

import Link from 'next/link';
import { ArrowUpRight, Eye } from 'lucide-react';
import { CopyButton } from '@/components/interior/copy-button';
import { Button } from '@/components/ui/button';

export function ProfileOwnerBar({ username }: { username: string }) {
  const publicPath = `/profile/${encodeURIComponent(username)}`;
  return (
    <div
      data-testid="profile-owner-bar"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/70 bg-muted/30 px-4 py-2 sm:px-6 lg:px-8"
    >
      <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Eye aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">This is your public page. Visitors see it like this.</span>
      </p>
      {/* Small buttons keep their 32px height for touch; only the type shrinks. */}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <CopyButton
          label="Copy link"
          copiedLabel="Link copied"
          value={() => `${window.location.origin}${publicPath}`}
          className="text-xs"
        />
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href={`${publicPath}/edit`}>Edit profile</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-xs text-primary hover:text-primary">
          <Link href="/studio/curator">
            Open Curator Studio
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
