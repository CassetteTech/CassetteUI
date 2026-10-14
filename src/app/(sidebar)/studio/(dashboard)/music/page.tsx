'use client';

import { useContext, useRef, useState, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ListFilter } from 'lucide-react';
import { TextMorph } from 'torph/react';
import { audienceDetails, nounsOf, typeDetails } from '@/components/features/curator/studio-music-filters';
import {
  LibraryEmpty,
  libraryPageSize,
  useLibrary,
  useLibraryRowTools,
} from '@/components/features/curator/studio-music-library';
import {
  StudioMusicRow,
  StudioMusicRowSkeleton,
  type StudioMusicRowProps,
} from '@/components/features/curator/studio-music-row';
import { StudioSection, StudioStepsContext } from '@/components/features/curator/studio-shell';
import {
  musicAudiences,
  musicTypes,
  studioMusicHref,
  type MusicAudience,
  type MusicType,
} from '@/components/features/curator/studio-routes';
import { postVisibility } from '@/components/features/post/post-visibility';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listTabClassName, listTabsRowClassName } from '@/components/ui/list-tabs';
import { TabUnderline } from '@/components/ui/tab-underline';
import { useAuthState } from '@/hooks/use-auth';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { profileQueryKeys } from '@/hooks/use-profile';
import { pagesShortened } from '@/lib/studio-music-pages';
import { cn } from '@/lib/utils';
import { keepSecondPressOnTrigger } from '@/lib/utils/menu-trigger';
import { profileService } from '@/services/profile';
import type { ActivityPost } from '@/types';

const typeTabs: ReadonlyArray<{ value: MusicType | null; label: string }> = [
  { value: null, label: 'All' },
  ...musicTypes.map((value) => ({ value, label: typeDetails[value].label })),
];

function countedNoun(total: number, type: MusicType | null, audience: MusicAudience | null) {
  const nouns = nounsOf(type);
  const adjective = audience ? `${audienceDetails[audience].adjective} ` : '';
  return `${adjective}${total === 1 ? nouns.one : nouns.many}`;
}

const uncountedLine = 'Everything on your page, newest first.';

function useCountLine(settledLine: string | null) {
  const [line, setLine] = useState(uncountedLine);
  if (settledLine !== null && settledLine !== line) setLine(settledLine);
  return line;
}

function useArtistsTab(userId: string | null, type: MusicType | null) {
  const artists = useQuery({
    queryKey: profileQueryKeys.studioActivity(userId, 'studio-artists'),
    queryFn: () => profileService.fetchUserActivity(userId!, { pageSize: 1, elementType: typeDetails.artists.elementType }),
    enabled: userId !== null,
  });
  return type === 'artists' || (artists.data?.totalItems ?? 0) > 0;
}

/** Reads the next page. Pages are read by offset, so when a post removed here left a loaded page
    short, or the total changed since the first page, the loaded pages are read again so nothing
    is skipped or repeated. */
async function showMore(library: ReturnType<typeof useLibrary>['library']) {
  if (pagesShortened(library.data?.pages ?? [], libraryPageSize)) {
    const reread = await library.refetch();
    if (reread.isError || !reread.data?.pages.at(-1)?.hasNext) return;
  }
  const next = await library.fetchNextPage();
  const pages = next.data?.pages ?? [];
  if (pages.length > 1 && pages[pages.length - 1].totalItems !== pages[0].totalItems) await library.refetch();
}

function AudienceFilter({
  audience,
  onChange,
}: {
  audience: MusicAudience | null;
  onChange: (next: MusicAudience | null) => void;
}) {
  const current = audience ? postVisibility[audienceDetails[audience].privacy] : null;
  const Icon = current?.icon ?? ListFilter;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="studio-music-audience"
          onMouseDown={keepSecondPressOnTrigger}
          className={cn('bg-background/60', current && 'border-foreground/40')}
        >
          <Icon aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Who can open it:</span>
          <TextMorph>{current?.label ?? 'All'}</TextMorph>
          <ChevronDown aria-hidden className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuRadioGroup
          value={audience ?? 'all'}
          onValueChange={(next) => onChange(musicAudiences.find((value) => value === next) ?? null)}
        >
          <DropdownMenuRadioItem value="all">All posts</DropdownMenuRadioItem>
          {musicAudiences.map((value) => {
            const setting = postVisibility[audienceDetails[value].privacy];
            return (
              <DropdownMenuRadioItem key={value} value={value} className="gap-2">
                <setting.icon aria-hidden className="size-4 text-muted-foreground" />
                {setting.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TypeTabs({ type, audience, showArtists }: {
  type: MusicType | null;
  audience: MusicAudience | null;
  showArtists: boolean;
}) {
  return (
    <nav aria-label="Type of music" className={listTabsRowClassName}>
      <TabUnderline value={type ?? 'all'} />
      {typeTabs.filter((tab) => tab.value !== 'artists' || showArtists).map((tab) => {
        const active = tab.value === type;
        return (
          <Link
            key={tab.label}
            href={studioMusicHref({ type: tab.value, audience })}
            replace
            scroll={false}
            // No browser link drag, so a click that moves a few pixels still opens the tab.
            draggable={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              listTabClassName(active),
              'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            )}
          >
            <span className="tab-label" data-label={tab.label} data-state={active ? 'active' : 'inactive'}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function LibraryRows({ listRef, posts, total, library, rowProps }: {
  listRef: RefObject<HTMLUListElement | null>;
  posts: ActivityPost[];
  total: number;
  library: ReturnType<typeof useLibrary>['library'];
  rowProps: Omit<StudioMusicRowProps, 'post'>;
}) {
  const switching = library.isPlaceholderData;
  return (
    <>
      <ul
        ref={listRef}
        inert={switching}
        aria-busy={switching || undefined}
        className={cn('divide-y divide-border/60 transition-opacity duration-150', switching && 'opacity-50')}
      >
        {posts.map((post) => <StudioMusicRow key={post.postId} post={post} {...rowProps} />)}
      </ul>
      {library.hasNextPage && !switching && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={library.isFetching} onClick={() => void showMore(library)}>
            {library.isFetchingNextPage ? 'Loading…' : 'Show more'}
          </Button>
          <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
            {`${posts.length} of ${total}`}
          </p>
        </div>
      )}
      {library.isFetchNextPageError && (
        <p role="alert" className="mt-3 text-sm text-destructive">Could not load more music. Try again.</p>
      )}
      {library.isRefetchError && !library.isFetching && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-destructive">Could not refresh your music.</p>
          <Button variant="outline" size="sm" onClick={() => void library.refetch()}>Try again</Button>
        </div>
      )}
    </>
  );
}

export default function StudioMusicPage() {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = musicTypes.find((value) => value === searchParams.get('type')) ?? null;
  const audience = musicAudiences.find((value) => value === searchParams.get('audience')) ?? null;
  const returnPath = studioMusicHref({ type, audience });
  const steps = useContext(StudioStepsContext);
  const access = useMemberPostAccess();
  const { library, posts, total } = useLibrary(userId, type, audience);
  const showArtists = useArtistsTab(userId, type);
  const countLine = useCountLine(!library.data || library.isPlaceholderData ? null
    : total > 1 ? `${total} ${countedNoun(total, type, audience)}, newest first.`
    : total === 1 ? `1 ${countedNoun(1, type, audience)}.`
    : uncountedLine);
  const listRef = useRef<HTMLUListElement>(null);
  const { onSaved, onEdit, onDelete, sheets } = useLibraryRowTools({
    userId,
    posts,
    listRef,
    sectionId: 'studio-music',
    leavesList: (privacy) => audience !== null && privacy !== undefined && privacy !== audienceDetails[audience].privacy,
  });

  let body: ReactNode;
  if (library.isPending) {
    body = (
      <>
        <output className="sr-only">Loading your music…</output>
        <ul aria-hidden className="divide-y divide-border/60">
          {[0, 1, 2].map((index) => <StudioMusicRowSkeleton key={index} />)}
        </ul>
      </>
    );
  } else if (posts.length === 0 && library.isError) {
    body = (
      <div className="flex flex-wrap items-center gap-3 py-2">
        <p role="alert" className="text-sm text-destructive">Could not load your music.</p>
        <Button variant="outline" size="sm" onClick={() => void library.refetch()}>Try again</Button>
      </div>
    );
  } else if (posts.length === 0) {
    body = <LibraryEmpty type={type} audience={audience} returnPath={returnPath} />;
  } else {
    body = (
      <LibraryRows
        listRef={listRef}
        posts={posts}
        total={total}
        library={library}
        rowProps={{
          returnPath,
          access: access.state,
          retryAccess: access.refetch,
          openPlanSetup: () => steps?.open('studio-plan'),
          onSaved,
          onEdit,
          onDelete,
        }}
      />
    );
  }

  return (
    <StudioSection
      id="studio-music"
      title="Music"
      headingId="studio-music-title"
      // Stays mounted, so a new count after a filter change is announced. The morph keeps a
      // plain copy of the line for screen readers and hides its moving letters.
      description={<span aria-live="polite" className="tabular-nums"><TextMorph>{countLine}</TextMorph></span>}
      plain
      chip={(
        <AudienceFilter
          audience={audience}
          onChange={(next) => router.replace(studioMusicHref({ type, audience: next }), { scroll: false })}
        />
      )}
      tabs={<TypeTabs type={type} audience={audience} showArtists={showArtists} />}
    >
      <div className="[container-type:inline-size]">{body}</div>
      {sheets}
    </StudioSection>
  );
}
