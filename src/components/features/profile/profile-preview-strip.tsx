'use client';

import Link from 'next/link';
import { ArrowUpRight, Eye } from 'lucide-react';
import { musicTypes, studioMusicHref } from '@/components/features/curator/studio-routes';
import type { ProfileMusicView } from '@/components/features/profile/profile-music-view';
import { CopyButton } from '@/components/interior/copy-button';
import { Button } from '@/components/ui/button';

export function ProfilePreviewStrip({ username, musicView }: { username: string; musicView: ProfileMusicView | null }) {
  const publicPath = `/profile/${encodeURIComponent(username)}`;
  const type = musicTypes.find((value) => value === musicView) ?? null;
  return (
    <div
      data-testid="profile-preview-strip"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/70 bg-muted/30 px-4 py-2 sm:px-6 lg:px-8"
    >
      <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Eye aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">This is your public page, as visitors see it.</span>
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <CopyButton
          label="Copy link"
          copiedLabel="Link copied"
          value={() => `${window.location.origin}${publicPath}`}
          className="text-xs"
        />
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link href={studioMusicHref({ type })}>
            Open Studio
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
