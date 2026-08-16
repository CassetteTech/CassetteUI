'use client';

import { useId } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Disc3,
  ListMusic,
  LockKeyhole,
  Music,
  User,
} from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth';
import { useCuratorPage } from '@/hooks/use-curator';
import {
  CuratorPageError,
  formatCuratorPlanPrice,
  type CuratorPage as CuratorPageData,
  type CuratorPostItem,
} from '@/services/curator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';

function getPostIcon(elementType: string) {
  switch (elementType.toLowerCase()) {
    case 'playlist': return ListMusic;
    case 'artist': return User;
    case 'album': return Disc3;
    default: return Music;
  }
}

export function PublicCuratorPage({ username }: { username: string }) {
  const instanceId = useId();
  const curatorNameId = `curator-name-${instanceId}`;
  const feedHeadingId = `curator-feed-heading-${instanceId}`;
  const membershipId = `membership-${instanceId}`;
  const { user, isLoading: authLoading } = useAuthState();
  const viewerKey = authLoading ? null : (user?.id ?? 'anonymous');
  const query = useCuratorPage(username, viewerKey);

  if (authLoading || query.isPending) {
    return <CuratorPageSkeleton />;
  }

  if (query.isError) {
    if (query.error instanceof CuratorPageError && query.error.status === 404) {
      return <CuratorNotFound />;
    }
    return <CuratorLoadError onRetry={() => void query.refetch()} />;
  }

  const page = query.data.pages[0];
  const posts = query.data.pages.flatMap((result) => result.posts.items);
  const displayName = page.curator.displayName?.trim() || page.curator.username;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <CuratorIdentity page={page} displayName={displayName} headingId={curatorNameId} />

      <div className={cn(
        'mt-8 grid gap-6',
        page.membership && 'lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start',
      )}>
        <CuratorFeed
          items={posts}
          displayName={displayName}
          headingId={feedHeadingId}
          membershipId={membershipId}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
        {page.membership && (
          <MembershipCard page={page} displayName={displayName} membershipId={membershipId} />
        )}
      </div>
    </div>
  );
}

function CuratorIdentity({
  page,
  displayName,
  headingId,
}: {
  page: CuratorPageData;
  displayName: string;
  headingId: string;
}) {
  const { curator, viewer } = page;
  const interests = [...new Set([...curator.declaredGenres, ...curator.declaredPlatforms])];

  return (
    <section
      data-testid="curator-profile"
      aria-labelledby={headingId}
      className="rounded-xl border border-border/70 bg-card p-5 elev-1 sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar className="size-24 border-2 border-foreground/80 sm:size-28">
          <AvatarImage src={curator.avatarUrl ?? undefined} alt={`@${curator.username}`} />
          <AvatarFallback className="text-2xl font-bold text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id={headingId} className="min-w-0 break-words font-teko text-4xl font-bold uppercase leading-none sm:text-5xl">
              {displayName}
            </h1>
            <VerificationBadge accountType={curator.accountType} size="md" />
            {viewer.hasMemberBadge && (
              <Badge className="gap-1">
                <BadgeCheck aria-hidden />
                Member
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            @{curator.username}
          </p>
          {curator.headline && (
            <p className="mt-4 max-w-3xl break-words text-lg font-semibold leading-snug sm:text-xl">
              {curator.headline}
            </p>
          )}
          {curator.bio && (
            <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
              {curator.bio}
            </p>
          )}
          <ProfileLinksRow links={curator.profileLinks} className="mt-3" />
        </div>
      </div>

      <div className="mt-6 border-t border-border/70 pt-5">
        {curator.about && (
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em]">About</h2>
            <p className="mt-2 max-w-3xl whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
              {curator.about}
            </p>
          </div>
        )}
        {interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Curator interests">
            {interests.map((label) => (
              <Badge key={label} variant="outline">{label}</Badge>
            ))}
          </div>
        )}
        <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          Curating since {new Date(curator.curatorSinceUtc).getUTCFullYear()}
        </p>
      </div>
    </section>
  );
}

function MembershipCard({
  page,
  displayName,
  membershipId,
}: {
  page: CuratorPageData;
  displayName: string;
  membershipId: string;
}) {
  const plan = page.membership;
  if (!plan) return null;

  const monthlyPrice = formatCuratorPlanPrice(
    plan.amountMinor,
    plan.serviceFeeMinor,
    plan.currency,
  );
  const annualPrice = plan.annualAmountMinor === null || plan.annualServiceFeeMinor === null
    ? null
    : formatCuratorPlanPrice(
        plan.annualAmountMinor,
        plan.annualServiceFeeMinor,
        plan.currency,
      );

  return (
    <aside className="order-first lg:order-last lg:sticky lg:top-6" aria-label="Membership">
      <Card id={membershipId} data-testid="curator-membership-card" className="border-foreground/30 elev-2">
        <CardHeader>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Membership
          </p>
          <h2 className="break-words font-teko text-3xl font-semibold uppercase leading-none">{plan.name}</h2>
          <div className="pt-2">
            <span className="font-teko text-3xl font-bold">{monthlyPrice}</span>
            <span className="text-sm text-muted-foreground">/month</span>
            {annualPrice && (
              <p className="mt-1 text-sm text-muted-foreground">or {annualPrice}/year</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {plan.description && (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {plan.description}
            </p>
          )}
          {plan.benefits.length > 0 && (
            <ul className="mt-5 space-y-3" aria-label="Membership benefits">
              {plan.benefits.map((benefit) => (
                <li key={benefit.featureKey} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="font-semibold">{benefit.name}</span>
                    {benefit.description && (
                      <span className="mt-0.5 block text-muted-foreground">{benefit.description}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            {page.viewer.isOwner ? (
              <p className="text-sm font-medium text-muted-foreground">Your published membership plan</p>
            ) : page.viewer.isMember ? (
              <Badge variant="secondary" className="px-3 py-1.5">Member</Badge>
            ) : (
              <Button asChild className="w-full">
                <a href={`#${membershipId}`} aria-label={`Join ${displayName}'s membership`}>
                  Join {displayName}
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function CuratorFeed({
  items,
  displayName,
  headingId,
  membershipId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  items: CuratorPostItem[];
  displayName: string;
  headingId: string;
  membershipId: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <section data-testid="curator-feed" aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="font-teko text-3xl font-bold uppercase">Latest posts</h2>
      {items.length === 0 ? (
        <Card className="mt-3 px-6 text-center text-sm text-muted-foreground">
          No posts yet.
        </Card>
      ) : (
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {items.map((item) => item.kind === 'locked'
            ? (
                <LockedPost
                  key={item.postId}
                  createdAt={item.createdAt}
                  displayName={displayName}
                  membershipId={membershipId}
                />
              )
            : <CuratorPost key={item.post.postId} post={item.post} />)}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  );
}

function LockedPost({
  createdAt,
  displayName,
  membershipId,
}: {
  createdAt: string;
  displayName: string;
  membershipId: string;
}) {
  return (
    <article data-testid="curator-locked-post" aria-label="Members-only post">
      <Card className="justify-center border-dashed border-primary/40 px-5 py-6 text-center">
        <LockKeyhole className="mx-auto size-7 text-primary" aria-hidden />
        <div>
          <h3 className="font-teko text-2xl font-bold uppercase">Members-only post</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Join {displayName} to unlock this post.
          </p>
          <time dateTime={createdAt} className="mt-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {formatRelativeTime(createdAt)}
          </time>
        </div>
        <Button asChild variant="outline" size="sm" className="mx-auto">
          <a href={`#${membershipId}`}>Join</a>
        </Button>
      </Card>
    </article>
  );
}

function CuratorPost({ post }: { post: Extract<CuratorPostItem, { kind: 'post' }>['post'] }) {
  const TypeIcon = getPostIcon(post.elementType);
  const targetPostId = post.redirectPostId || post.postId;
  const title = post.title.trim() || `${post.elementType} post`;
  const detail = post.description?.trim() || post.subtitle?.trim();

  return (
    <Card className="gap-0 overflow-hidden p-0 elev-1 sm:gap-0 sm:p-0">
      <Link href={`/post/${targetPostId}`} prefetch={false} className="block p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          <div className="relative size-24 shrink-0 sm:size-28">
            <ArtworkImage
              src={post.imageUrl}
              alt={title}
              width={112}
              height={112}
              className="size-full rounded-md object-cover ring-1 ring-border/40"
              fallbackClassName="rounded-md ring-1 ring-border/40"
            />
            <Badge className="absolute bottom-1.5 left-1.5 bg-background/90 text-foreground" variant="outline">
              <TypeIcon aria-hidden />
              {post.elementType}
            </Badge>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span className="truncate font-bold text-foreground/80">@{post.username}</span>
              <VerificationBadge accountType={post.accountType ?? undefined} size="sm" />
              <span>/ {formatRelativeTime(post.createdAt)}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 break-words font-teko text-2xl uppercase leading-none">
              {title}
            </h3>
            {detail && (
              <p className="mt-2 line-clamp-2 text-sm italic leading-snug text-muted-foreground">
                {detail}
              </p>
            )}
            {post.privacy === 'subscriber' && (
              <Badge variant="secondary" className="mt-3">Members</Badge>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}

function CuratorNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-teko text-4xl font-bold uppercase">Curator not found</h1>
      <p className="mt-2 text-muted-foreground">This curator page is not available.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/explore">Explore music</Link>
      </Button>
    </div>
  );
}

function CuratorLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-teko text-4xl font-bold uppercase">Could not load curator</h1>
      <p className="mt-2 text-muted-foreground">Try again in a moment.</p>
      <Button onClick={onRetry} className="mt-6">Try again</Button>
    </div>
  );
}

function CuratorPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10" aria-label="Loading curator">
      <div className="rounded-xl border bg-card p-5 sm:p-7">
        <div className="flex gap-5">
          <Skeleton className="size-24 shrink-0 rounded-full sm:size-28" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Skeleton className="order-first h-72 rounded-xl lg:order-last" />
      </div>
    </div>
  );
}
