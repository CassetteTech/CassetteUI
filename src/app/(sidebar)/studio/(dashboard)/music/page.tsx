'use client';

/** Studio Music: the curator's library. Type tabs and a who-can-open-it filter narrow the list;
    both live in the URL, so a post's Back returns to the same view. Each row shows the curation
    with its owner tools, and a saved change updates every cached list at once. */

import { useContext, useRef, type ReactNode, type RefObject } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ListFilter } from 'lucide-react';
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
import { FilterPillLink } from '@/components/ui/filter-pills';
import { useAuthState } from '@/hooks/use-auth';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { pagesShortened } from '@/lib/studio-music-pages';
import { cn } from '@/lib/utils';
import { keepSecondPressOnTrigger } from '@/lib/utils/menu-trigger';
import { profileService } from '@/services/profile';
import type { ActivityPost } from '@/types';

// Playlists lead, because most curator tools work on playlists.
const typeTabs: ReadonlyArray<{ value: MusicType | null; label: string }> = [
  { value: null, label: 'All' },
  ...musicTypes.map((value) => ({ value, label: typeDetails[value].label })),
];

/** What the count after the tabs counts, such as "members-only playlists". */
function countedNoun(total: number, type: MusicType | null, audience: MusicAudience | null) {
  const nouns = nounsOf(type);
  const adjective = audience ? `${audienceDetails[audience].adjective} ` : '';
  return `${adjective}${total === 1 ? nouns.one : nouns.many}`;
}

/** Artists are the rarest posts, so their tab shows once the library holds one, or while it is open. */
function useArtistsTab(userId: string | null, type: MusicType | null) {
  const artists = useQuery({
    queryKey: ['user-activity', userId, 'studio-artists'],
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

/** Who can open it, as a secondary filter beside the section title. */
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
          {current?.label ?? 'All'}
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

/** The type of music, as links that keep the audience filter. They wrap rather than scroll, so
    a narrow list never hides one. */
function TypeTabs({ type, audience, showArtists }: {
  type: MusicType | null;
  audience: MusicAudience | null;
  showArtists: boolean;
}) {
  return (
    <nav aria-label="Type of music" className="flex flex-wrap gap-1.5">
      {typeTabs.filter((tab) => tab.value !== 'artists' || showArtists).map((tab) => {
        const active = tab.value === type;
        return (
          <FilterPillLink
            key={tab.label}
            href={studioMusicHref({ type: tab.value, audience })}
            replace
            scroll={false}
            active={active}
          >
            {tab.label}
          </FilterPillLink>
        );
      })}
    </nav>
  );
}

/** The posts with their tools, then the next page. While a filter change loads, the last list
    stays inert and dimmed. */
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
          {/* Waits out a refresh, so the next page is read against current pages. */}
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
      {/* A failed refresh keeps the list on screen; say so, since the list may be behind Bridge. */}
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
      description="Everything on your page, newest first."
      plain
      chip={(
        <AudienceFilter
          audience={audience}
          onChange={(next) => router.replace(studioMusicHref({ type, audience: next }), { scroll: false })}
        />
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-2">
        <TypeTabs type={type} audience={audience} showArtists={showArtists} />
        {/* Stays mounted, so a new count after a filter change is announced. An empty list says it itself. */}
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {library.data && !library.isPlaceholderData && total > 0 && (
            <>
              <span className="tabular-nums">{total}</span>
              {` ${countedNoun(total, type, audience)}`}
            </>
          )}
        </p>
      </div>

      <div className="mt-2 [container-type:inline-size]">{body}</div>
      {sheets}
    </StudioSection>
  );
}
