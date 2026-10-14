'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowUpRight, ChevronDown, ExternalLink, Loader2, LockKeyhole, MoreHorizontal, Pencil, Plus, Repeat2, Share, Trash2 } from 'lucide-react';
import { TextMorph } from 'torph/react';
import { PostQuickActions } from '@/components/features/post/post-quick-actions';
import {
  membersOptionOf,
  ownerVisibilities,
  postVisibility,
  visibilityOf,
  type OwnerVisibility,
} from '@/components/features/post/post-visibility';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { MemberPostAccessState } from '@/hooks/use-curator';
import { useUpdatePost } from '@/hooks/use-music';
import { appLogger } from '@/lib/observability/logger';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { keepSecondPressOnTrigger } from '@/lib/utils/menu-trigger';
import { canShareWebContent, shareWebContent } from '@/utils/web-share';
import type { ActivityPost } from '@/types';

function typeName(elementType: string) {
  return elementType.charAt(0).toUpperCase() + elementType.slice(1).toLowerCase();
}

async function sharePost(post: ActivityPost) {
  const url = `${window.location.origin}/post/${post.redirectPostId || post.postId}`;
  try {
    if (canShareWebContent() && window.matchMedia('(pointer: coarse)').matches) {
      await shareWebContent({ title: post.title, text: `Check out "${post.title}" on Cassette`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copied.');
  } catch (error) {
    appLogger.warn('studio_music_share_failed', { error, route: '/studio/music' });
    toast.error('Could not share this post. Try again.');
  }
}

const rowToolHitArea = 'relative after:absolute after:-inset-1';

const rowIconButton = cn(
  rowToolHitArea,
  'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted data-[state=open]:bg-muted data-[state=open]:text-foreground',
);

const rowGrid = 'grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-4 [@container(min-width:40rem)]:grid-cols-[6rem_minmax(0,1fr)_auto] [@container(min-width:40rem)]:gap-x-5';
const rowArtwork = 'row-span-2 [@container(min-width:40rem)]:row-span-1';
const rowTools = 'col-start-2 [@container(min-width:40rem)]:col-start-auto';

function useVisibilitySave(post: ActivityPost, onSaved: StudioMusicRowProps['onSaved']) {
  const updatePost = useUpdatePost();
  const pending = updatePost.isPending;
  const choose = (next: OwnerVisibility) => {
    if (next === post.privacy || pending) return;
    updatePost.mutate({ postId: post.postId, privacy: next }, {
      onSuccess: () => {
        onSaved(post, { privacy: next });
        toast.success(next === 'subscriber' ? 'Post locked for members.' : 'Post visibility updated.');
      },
      onError: () => toast.error('Failed to update post visibility. Please try again.'),
    });
  };
  return { choose, pending };
}

interface VisibilityMenuProps {
  post: ActivityPost;
  access: MemberPostAccessState;
  retryAccess: () => void;
  openPlanSetup: () => void;
  choose: (next: OwnerVisibility) => void;
  pending: boolean;
}

function VisibilityMenu({ post, access, retryAccess, openPlanSetup, choose, pending }: VisibilityMenuProps) {
  const current = visibilityOf(post.privacy);
  const members = membersOptionOf(access, post.privacy);

  const membersSummary = members.needsPlan
    ? 'Needs a published plan with member posts.'
    : access === 'error' && members.waiting
      ? 'Could not check your membership plans.'
      : members.waiting
        ? 'Checking your membership plans…'
        : postVisibility.subscriber.summary;
  const Icon = current?.icon;
  const label = current?.label ?? 'Older setting';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-row-action="visibility"
          onMouseDown={keepSecondPressOnTrigger}
          aria-busy={pending || undefined}
          aria-label={`Who can open ${post.title}: ${label}`}
          className={cn(
            rowToolHitArea,
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted',
          )}
        >
          {Icon && <Icon aria-hidden className="size-3.5 text-muted-foreground" />}
          <TextMorph>{label}</TextMorph>
          {pending
            ? <Loader2 aria-hidden className="size-3.5 animate-spin text-muted-foreground" />
            : <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Who can open it</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current ? post.privacy?.toLowerCase() : ''}>
          {ownerVisibilities.map((option) => {
            const setting = postVisibility[option];
            const locked = option === 'subscriber' && members.needsPlan;
            const OptionIcon = locked ? LockKeyhole : setting.icon;
            return (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                disabled={option === 'subscriber' && (locked || members.waiting)}
                onSelect={() => choose(option)}
                className="items-start gap-2.5 py-2"
              >
                <OptionIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="grid gap-0.5">
                  <span className="font-medium">{setting.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option === 'subscriber' ? membersSummary : setting.summary}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        {members.needsPlan && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={openPlanSetup}>
              Set up memberships
              <ArrowUpRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
            </DropdownMenuItem>
          </>
        )}
        {access === 'error' && members.waiting && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); retryAccess(); }}>
              Check plans again
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface StudioMusicRowProps {
  post: ActivityPost;
  returnPath: string;
  access: MemberPostAccessState;
  retryAccess: () => void;
  openPlanSetup: () => void;
  onSaved: (post: ActivityPost, change: Partial<ActivityPost>) => void;
  onEdit: (post: ActivityPost, returnFocus: HTMLElement | null) => void;
  onDelete: (post: ActivityPost, returnFocus: HTMLElement | null) => void;
}

export function StudioMusicRow({
  post,
  returnPath,
  access,
  retryAccess,
  openPlanSetup,
  onSaved,
  onEdit,
  onDelete,
}: StudioMusicRowProps) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const visibility = useVisibilitySave(post, onSaved);
  const repost = post.isRepost === true;
  const href = `/post/${post.redirectPostId || post.postId}?from=${encodeURIComponent(returnPath)}`;
  const note = post.description?.trim();
  const repostedFrom = post.originalPostOwnerUsername || post.originalUsername;
  const details = [typeName(post.elementType), post.subtitle?.trim()].filter(Boolean).join(' · ');

  return (
    <PostQuickActions
      postId={post.postId}
      title={post.title}
      href={href}
      onShare={() => void sharePost(post)}
      isOwner={!repost}
      privacy={post.privacy}
      visibilities={ownerVisibilities}
      canLockPosts={access === 'ready'}
      onVisibilityChange={visibility.choose}
      onEdit={() => onEdit(post, moreRef.current)}
      onDelete={() => onDelete(post, moreRef.current)}
    >
      <li data-testid="studio-music-row" data-post-id={post.postId} className={cn('group/row', rowGrid)}>
        <Link href={href} prefetch={false} tabIndex={-1} aria-hidden className={cn('block overflow-hidden rounded-md', rowArtwork)}>
          <ArtworkImage
            src={post.imageUrl}
            alt=""
            width={96}
            height={96}
            className="aspect-square size-full rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            fallbackClassName="aspect-square size-full rounded-md bg-muted/60 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            fallbackIconClassName="size-6 text-muted-foreground/50"
          />
        </Link>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[0.9375rem] font-medium leading-snug [text-wrap:pretty]">
            <Link
              href={href}
              prefetch={false}
              data-row-title
              className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{details}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt} className="shrink-0 tabular-nums">{formatRelativeTime(post.createdAt)}</time>
          </p>
          {repost ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Repeat2 aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{repostedFrom ? `Reposted from @${repostedFrom}` : 'Reposted'}</span>
            </p>
          ) : (
            <button
              type="button"
              data-row-action="note"
              onClick={(event) => onEdit(post, event.currentTarget)}
              className="-mx-1.5 mt-1.5 flex max-w-full items-start gap-1.5 rounded-md px-1.5 py-0.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {note ? (
                <>
                  <Pencil aria-hidden className="mt-[0.1875rem] size-3.5 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2 text-foreground/85 [text-wrap:pretty]">{note}</span>
                  <span className="sr-only">{` Edit the note on ${post.title}`}</span>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Plus aria-hidden className="size-3.5 shrink-0" />
                  Add a note
                  <span className="sr-only">{` to ${post.title}`}</span>
                </span>
              )}
            </button>
          )}
        </div>

        <div className={cn('flex items-center gap-2', rowTools, '[@container(min-width:40rem)]:-mr-2')}>
          {repost ? (
            <p className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
              <Repeat2 aria-hidden className="size-3.5" />
              Public repost
            </p>
          ) : (
            <VisibilityMenu
              post={post}
              access={access}
              retryAccess={retryAccess}
              openPlanSetup={openPlanSetup}
              choose={visibility.choose}
              pending={visibility.pending}
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            data-row-action="share"
            aria-label={`Share ${post.title}`}
            onClick={() => void sharePost(post)}
            className={rowIconButton}
          >
            <Share aria-hidden />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                ref={moreRef}
                variant="ghost"
                size="icon-sm"
                data-row-action="more"
                aria-label={`More actions for ${post.title}`}
                onMouseDown={keepSecondPressOnTrigger}
                className={rowIconButton}
              >
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem asChild className="gap-2">
                <Link href={href} prefetch={false}>
                  <ExternalLink aria-hidden className="size-4" />
                  Open post
                </Link>
              </DropdownMenuItem>
              {!repost && (
                <DropdownMenuItem onSelect={() => onEdit(post, moreRef.current)} className="gap-2">
                  <Pencil aria-hidden className="size-4" />
                  Edit note
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDelete(post, moreRef.current)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 aria-hidden className="size-4" />
                {repost ? 'Remove repost' : 'Delete post'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
    </PostQuickActions>
  );
}

export function StudioMusicRowSkeleton() {
  return (
    <li className={rowGrid}>
      <Skeleton className={cn('aspect-square w-full rounded-md', rowArtwork)} />
      <div className="space-y-2.5 pt-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      <Skeleton className={cn('h-8 w-44', rowTools)} />
    </li>
  );
}
