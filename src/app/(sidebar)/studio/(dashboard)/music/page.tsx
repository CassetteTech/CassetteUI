'use client';

/** Studio Music: every post on the curator's page, newest first, with who can open each.
    A row opens the post page, where the owner column changes visibility and shows insights. */

import { useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { StudioSection } from '@/components/features/curator/studio-shell';
import { addMusicHref, studioPaths } from '@/components/features/curator/studio-routes';
import {
  ownerVisibilities,
  postVisibility,
  visibilityOf,
  type OwnerVisibility,
} from '@/components/features/post/post-visibility';
import { SegmentedControl } from '@/components/interior/segmented-control';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState } from '@/hooks/use-auth';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { profileService } from '@/services/profile';
import type { ActivityPost } from '@/types';

type Audience = 'all' | OwnerVisibility;

const pageSize = 20;
const musicPath = studioPaths['studio-music'];
const audiences: readonly Audience[] = ['all', ...ownerVisibilities];
// Short labels, as on the Add music control, keep the four segments even on a phone.
const audienceOptions = audiences.map((value) => ({
  value,
  label: value === 'all' ? 'All' : value === 'subscriber' ? 'Members' : postVisibility[value].label,
}));

function typeLabel(post: ActivityPost) {
  const type = post.elementType.charAt(0).toUpperCase() + post.elementType.slice(1).toLowerCase();
  return post.isRepost ? `${type} repost` : type;
}

function MusicRow({ post }: { post: ActivityPost }) {
  const visibility = visibilityOf(post.privacy);
  const postId = post.redirectPostId || post.postId;
  return (
    <li>
      <Link
        href={`/post/${postId}?from=${encodeURIComponent(musicPath)}`}
        data-testid="studio-music-row"
        className="flex items-center gap-4 rounded-lg px-2 py-3 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArtworkImage
          src={post.imageUrl}
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-md object-cover ring-1 ring-border/40"
          fallbackClassName="size-12 shrink-0 rounded-md bg-muted/60 ring-1 ring-border/40"
          fallbackIconClassName="size-5 text-muted-foreground/50"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{post.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[post.subtitle, typeLabel(post)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {visibility && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <visibility.icon aria-hidden className="size-3.5" />
            {visibility.label}
          </span>
        )}
        <time dateTime={post.createdAt} className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
          {formatRelativeTime(post.createdAt)}
        </time>
      </Link>
    </li>
  );
}

export default function StudioMusicPage() {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const [audience, setAudience] = useState<Audience>('all');
  const music = useInfiniteQuery({
    queryKey: ['curator-studio-music-list', userId, audience],
    queryFn: ({ pageParam }) => profileService.fetchUserActivity(userId!, {
      page: pageParam,
      pageSize,
      privacy: audience === 'all' ? undefined : audience,
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: userId !== null,
    staleTime: 0,
  });
  const posts = music.data?.pages.flatMap((page) => page.items) ?? [];

  let body;
  if (music.isPending) {
    body = (
      <div aria-hidden className="space-y-3">
        {[0, 1, 2].map((index) => <Skeleton key={index} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  } else if (music.isError && posts.length === 0) {
    body = (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-destructive">Could not load your music.</p>
        <Button variant="outline" size="sm" onClick={() => music.refetch()}>Try again</Button>
      </div>
    );
  } else if (posts.length === 0 && audience === 'all') {
    body = (
      <Empty>
        <EmptyTitle>No music yet</EmptyTitle>
        <EmptyDescription>Add music to start your page. Fans see your posts there.</EmptyDescription>
        <Button asChild>
          <Link href={addMusicHref(musicPath)}>
            <Plus aria-hidden />
            Add your first music
          </Link>
        </Button>
      </Empty>
    );
  } else if (posts.length === 0) {
    body = <p className="text-sm text-muted-foreground">No posts with this setting.</p>;
  } else {
    body = (
      <>
        <ul className="-mx-2 divide-y divide-border/60">
          {posts.map((post) => <MusicRow key={post.postId} post={post} />)}
        </ul>
        {music.hasNextPage && (
          <Button
            variant="outline"
            className="mt-4"
            disabled={music.isFetchingNextPage}
            onClick={() => void music.fetchNextPage()}
          >
            {music.isFetchingNextPage ? 'Loading…' : 'Show more'}
          </Button>
        )}
        {music.isFetchNextPageError && (
          <p role="alert" className="mt-3 text-sm text-destructive">Could not load more music. Try again.</p>
        )}
      </>
    );
  }

  return (
    <StudioSection
      id="studio-music"
      title="Music"
      headingId="studio-music-title"
      description="Everything on your page, newest first. Open a post to change who can open it."
      chip={(
        <SegmentedControl
          label="Who can open it"
          className="w-full sm:w-auto"
          options={audienceOptions}
          value={audience}
          onValueChange={(value) => setAudience(audiences.find((option) => option === value) ?? 'all')}
        />
      )}
    >
      {body}
    </StudioSection>
  );
}
