'use client';

import { useEffect, useState, useCallback, useMemo, type ComponentProps } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { useUserBio, useUserLikedPosts } from '@/hooks/use-profile';
import { ProfileHeader } from '@/components/features/profile/profile-header';
import { ProfilePreviewStrip } from '@/components/features/profile/profile-preview-strip';
import { ProfileIdentityPass, ProfileSummary } from '@/components/features/profile/profile-identity-pass';
import { ProfileHeaderSkeleton } from '@/components/features/profile/profile-header-skeleton';
import { ProfileTabs, type TabType } from '@/components/features/profile/profile-tabs';
import { ProfileActivity, ActivitySkeleton } from '@/components/features/profile/profile-activity';
import { ProfileMusic, type ProfileMusicItem } from '@/components/features/profile/profile-music';
import {
  curatorPageFilterOf,
  profileMusicViewOf,
  withProfileMusicView,
  type ProfileMusicView,
} from '@/components/features/profile/profile-music-view';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { CuratorPageError } from '@/services/curator';
import { ActivityPost } from '@/types';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { appLogger } from '@/lib/observability/logger';
import { canShareWebContent, shareWebContent } from '@/utils/web-share';
import { CuratorPageSkeleton, MembershipPassSkeleton, PublicCuratorPage } from '@/components/features/curator/curator-page';
import { CuratorFollowConfirmation, CuratorFollowContext } from '@/components/features/curator/curator-follow-action';
import { useCuratorPage } from '@/hooks/use-curator';
import { useCuratorFollow } from '@/hooks/use-curator-follow';
import { toast } from 'sonner';
import { useCopyToClipboard } from '@/components/interior/copy-button';

const membershipFlows = ['join', 'return', 'canceled', 'portal-return'] as const;
const legacyMusicTabs = new Set(['posts', 'playlists', 'tracks', 'albums', 'artists']);
const musicPageSize = 20;

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuthState();

  const [additionalLikedPosts, setAdditionalLikedPosts] = useState<ActivityPost[]>([]);
  const [likedPage, setLikedPage] = useState(1);
  const [isLoadingMoreLiked, setIsLoadingMoreLiked] = useState(false);
  const [membershipSlot, setMembershipSlot] = useState<HTMLElement | null>(null);

  const userIdentifier = Array.isArray(username) ? username[0] : username;

  const isEditMode = userIdentifier === 'edit';
  const userIdToFetch = isEditMode && user ? user.id : userIdentifier;
  const curatorQuery = useCuratorPage(
    isEditMode ? '' : (userIdentifier ?? ''),
    isEditMode || authLoading ? null : (user?.id ?? 'anonymous'),
  );
  const curatorPage = curatorQuery.data?.pages[0];
  const noCuratorPage = isEditMode || (
    curatorQuery.isError && curatorQuery.error instanceof CuratorPageError && curatorQuery.error.status === 404
  );
  const membership = membershipFlows.find(
    (flow) => flow === searchParams.get('membership'),
  ) ?? null;
  const membershipInterval = searchParams.get('interval') === 'year' ? 'year' : 'month';

  const {
    data: userBio,
    isLoading: isLoadingBio,
    error: bioError
  } = useUserBio(userIdToFetch);
  const isCurrentUser = Boolean(
    userBio &&
    user &&
    (
      userBio.isOwnProfile ||
      user.id === userBio.id ||
      user.username?.toLowerCase() === userBio.username?.toLowerCase()
    )
  );
  const likedTabVisibility: 'public' | 'private' =
    userBio?.likedPostsPrivacy || userBio?.likedPostsVisibility || 'public';
  const likedSectionVisible = isCurrentUser || likedTabVisibility === 'public';

  const tabParam = searchParams.get('tab');
  const activeTab: TabType = tabParam === 'liked' && (likedSectionVisible || isLoadingBio) ? 'liked' : 'music';
  const isLikedTab = activeTab === 'liked';
  const musicView = profileMusicViewOf(searchParams);

  const follow = useCuratorFollow(
    curatorPage ? {
      id: curatorPage.curator.id,
      username: curatorPage.curator.username,
      displayName: curatorPage.curator.displayName?.trim() || curatorPage.curator.username,
    } : null,
    curatorPage?.viewer.isOwner ?? false,
    isLikedTab ? 'tab=liked' : withProfileMusicView(new URLSearchParams(), musicView).toString(),
  );

  const replaceQuery = useCallback((next: URLSearchParams) => {
    if (!pathname) return;
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}${window.location.hash}`, { scroll: false });
  }, [pathname, router]);

  // An older `?tab=` link becomes the Music tab and its type. A membership or Follow return strips
  // its own values from the URL, and a concurrent replace could bring them back, so it waits.
  const returning = membership !== null || searchParams.has('follow') || searchParams.has('intent');
  useEffect(() => {
    if (returning || !tabParam || !legacyMusicTabs.has(tabParam)) return;
    replaceQuery(withProfileMusicView(searchParams, profileMusicViewOf(searchParams)));
  }, [replaceQuery, returning, searchParams, tabParam]);

  useEffect(() => {
    if (searchParams.has('intent') || tabParam !== 'liked' || isLoadingBio || likedSectionVisible) return;
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    replaceQuery(next);
  }, [isLoadingBio, likedSectionVisible, replaceQuery, searchParams, tabParam]);

  const changeTab = useCallback((tab: TabType) => {
    if (tab === activeTab) return;
    const next = withProfileMusicView(searchParams, 'all');
    if (tab === 'liked') next.set('tab', 'liked');
    replaceQuery(next);
  }, [activeTab, replaceQuery, searchParams]);

  const changeMusicView = useCallback((view: ProfileMusicView) => {
    replaceQuery(withProfileMusicView(searchParams, view));
  }, [replaceQuery, searchParams]);

  const plainType = musicView === 'all' || musicView === 'members' ? null : musicView;
  const plainMusic = useInfiniteQuery({
    queryKey: ['user-activity', userIdToFetch, 'profile-music', plainType ?? 'all'],
    queryFn: ({ pageParam }) => profileService.fetchUserActivity(userIdToFetch!, {
      page: pageParam,
      pageSize: musicPageSize,
      elementType: plainType ? curatorPageFilterOf(plainType).elementType ?? undefined : undefined,
      privacy: 'public',
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: noCuratorPage && Boolean(userIdToFetch) && Boolean(userBio) && !isLikedTab,
  });
  const plainItems = useMemo((): ProfileMusicItem[] =>
    applyCachedArtwork((plainMusic.data?.pages ?? []).flatMap((page) => page.items))
      .map((post) => ({ kind: 'post', post })),
  [plainMusic.data]);

  const likedPostsUserId = userBio?.id || (isEditMode && user ? user.id : undefined);
  const {
    data: likedActivityData,
    isLoading: isLoadingLikedActivity,
    error: likedActivityError
  } = useUserLikedPosts(likedPostsUserId, {
    page: 1,
    enabled: isLikedTab && likedSectionVisible
  });
  const isLikedTabPrivateError = isLikedTab && likedActivityError?.message === 'Liked posts are private';
  const likedPosts = useMemo(() => {
    const initialPosts = likedActivityData?.items ?? [];
    return applyCachedArtwork([...initialPosts, ...additionalLikedPosts]);
  }, [likedActivityData?.items, additionalLikedPosts]);
  const likedTotal = likedActivityData?.totalItems ?? 0;

  useEffect(() => {
    setAdditionalLikedPosts([]);
    setLikedPage(1);
  }, [userIdToFetch]);

  const loadMoreLiked = useCallback(async () => {
    if (isLoadingMoreLiked || !likedPostsUserId || likedPosts.length >= likedTotal) return;
    try {
      setIsLoadingMoreLiked(true);
      const nextPage = likedPage + 1;
      const more = await profileService.fetchUserLikedPosts(likedPostsUserId, { page: nextPage });
      setAdditionalLikedPosts(prev => [...prev, ...more.items]);
      setLikedPage(nextPage);
    } catch (e) {
      appLogger.error('profile_activity_load_more_failed', { error: e, route: '/profile/[username]' });
    } finally {
      setIsLoadingMoreLiked(false);
    }
  }, [isLoadingMoreLiked, likedPage, likedPosts.length, likedPostsUserId, likedTotal]);

  const { copy: copyShareLink, copied: shareLinkCopied } = useCopyToClipboard({
    onError: (error) => {
      appLogger.warn('profile_share_copy_failed', { error, route: '/profile/[username]' });
      toast.error('Could not copy the profile link');
    },
  });

  const handleShare = useCallback(async () => {
    void captureClientEvent('profile_shared', {
      route: `/profile/${userBio?.username || ''}`,
      source_surface: 'profile',
      user_id: user?.id,
      is_authenticated: Boolean(user),
    });

    const shareUrl = `${window.location.origin}/profile/${userBio?.username}`;

    if (canShareWebContent()) {
      try {
        await shareWebContent({
          title: `${userBio?.displayName || userBio?.username}'s Profile`,
          text: `Check out ${userBio?.displayName || userBio?.username}'s music profile on Cassette`,
          url: shareUrl,
        });
      } catch (error) {
        appLogger.warn('profile_share_failed', { error, route: '/profile/[username]' });
      }
    } else {
      await copyShareLink(shareUrl);
    }
  }, [userBio, user, copyShareLink]);

  useEffect(() => {
    if (!userBio) return;

    void captureClientEvent('profile_viewed', {
      route: `/profile/${userBio.username}`,
      source_surface: 'profile',
      user_id: user?.id,
      is_authenticated: Boolean(user),
    });
  }, [userBio, user]);

  const showHeaderSkeleton = isLoadingBio && !userBio;
  // The back control belongs to other people's profiles; the route names whose profile loads.
  const showBack = userBio
    ? !isCurrentUser
    : showHeaderSkeleton && !isEditMode && userIdentifier !== user?.id
      && user?.username?.toLowerCase() !== userIdentifier?.toLowerCase();

  if (isEditMode && !user) {
    return (
      <div className="flex items-center justify-center min-h-svh">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">You must be logged in to edit your profile</p>
          <Button onClick={() => router.push('/auth/login')}>Log in</Button>
        </div>
      </div>
    );
  }

  const isProfileNotFound = bioError?.message === 'User not found';
  const error = (isProfileNotFound ? undefined : bioError?.message)
    || (isLikedTab && !isLikedTabPrivateError ? likedActivityError?.message : undefined)
    || (!isLikedTab && noCuratorPage ? plainMusic.error?.message : undefined);
  if (error) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-svh bg-transparent p-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <BackButton variant="button" fallbackRoute="/" />
            </div>
          </Container>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <BackButton variant="button" fallbackRoute="/" />
          </div>
        </div>
      </>
    );
  }

  if (isProfileNotFound || (!isLoadingBio && !userBio)) {
    return (
      <>
        <div className="bg-background lg:hidden">
          <Container className="min-h-svh bg-transparent p-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">User Not Found</h1>
              <p className="text-muted-foreground mb-4">The profile you&apos;re looking for doesn&apos;t exist.</p>
              <BackButton variant="button" fallbackRoute="/" />
            </div>
          </Container>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-4">The profile you&apos;re looking for doesn&apos;t exist.</p>
            <BackButton variant="button" fallbackRoute="/" />
          </div>
        </div>
      </>
    );
  }

  const curatorMusic = !isLikedTab && !noCuratorPage;
  const showMembershipRail = curatorMusic && Boolean(curatorPage?.membership);
  let content;
  if (isLikedTab) {
    content = (isLoadingBio || isLoadingLikedActivity) && likedPosts.length === 0 ? (
      <ActivitySkeleton count={6} />
    ) : isLikedTabPrivateError ? (
      <div className="p-8 text-center text-muted-foreground">
        Liked posts are private
      </div>
    ) : (
      <ProfileActivity
        posts={likedPosts}
        activeTab="liked"
        isLoading={isLoadingMoreLiked}
        onLoadMore={loadMoreLiked}
        hasMore={likedPosts.length < likedTotal}
        ownerAccountType={userBio?.accountType}
        ownerUsername={userBio?.username}
        isCurrentUser={isCurrentUser}
      />
    );
  } else if (noCuratorPage) {
    content = !userBio ? isLoadingBio && <ActivitySkeleton count={6} /> : (
      <ProfileMusic
        views={plainType ? ['all', plainType] : ['all']}
        view={plainType ?? 'all'}
        onViewChange={changeMusicView}
        items={plainItems}
        pending={plainMusic.isPending}
        hasMore={plainMusic.hasNextPage}
        loadingMore={plainMusic.isFetchingNextPage}
        onLoadMore={() => void plainMusic.fetchNextPage()}
        isOwner={isCurrentUser}
        displayName={userBio.displayName || userBio.username}
        ownerUsername={userBio.username}
        ownerAccountType={userBio.accountType}
      />
    );
  } else if (curatorQuery.isPending || !userBio) {
    content = <CuratorPageSkeleton />;
  } else {
    content = (
      <PublicCuratorPage
        username={userBio.username}
        membershipFlow={membership}
        initialInterval={membershipInterval}
        membershipSlot={membershipSlot}
        identitySummary={<ProfileSummary user={userBio} />}
        view={musicView}
        onViewChange={changeMusicView}
      />
    );
  }

  return (
    <CuratorFollowContext.Provider value={follow}>
    <div className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto" data-testid="profile-content-pane">
      {/* The preview strip frames the whole page for its owner, above the masthead and the tabs. */}
      {isCurrentUser && userBio && (
        <ProfilePreviewStrip username={userBio.username} musicView={isLikedTab ? null : musicView} />
      )}
      <div className="bg-background lg:hidden">
        <div className="mx-auto max-w-4xl">
          {showBack && (
            <div className="px-4 pt-4">
              <BackButton fallbackRoute="/explore" />
            </div>
          )}
          {showHeaderSkeleton ? (
            <ProfileHeaderSkeleton />
          ) : userBio ? (
            <ProfileHeader userBio={userBio} onShare={handleShare} shareCopied={shareLinkCopied} />
          ) : null}
        </div>
      </div>
      <ProfileTabStrip
        showBack={showBack}
        activeTab={activeTab}
        onTabChange={changeTab}
        showLikedTab={likedSectionVisible}
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 lg:px-8 lg:pt-6 lg:pb-10">
        {/* One pass in the rail: the membership pass by portal when the curator sells one, else
            the profile pass. The has() guard covers a lapsed member whose manage pass arrives late.
            The top offset clears the sticky tab strip, so the pass holds still across tabs. The rail
            comes first in the document, so on a phone the pass sits above the posts in reading and
            keyboard order; the grid places it in the right column on desktop. */}
        <div className="group lg:sticky lg:top-[5.25rem] lg:col-start-2 lg:row-start-1">
          {curatorMusic && (
            <aside
              ref={setMembershipSlot}
              aria-label="Membership"
              className="membership-slot empty:hidden px-4 pt-4 sm:px-6 lg:p-0"
            />
          )}
          {/* The curator page renders the pass once the profile also loads; until then its box holds the place. */}
          {curatorMusic && (curatorQuery.isPending || (Boolean(curatorPage?.membership) && !userBio)) && (
            <MembershipPassSkeleton />
          )}
          {userBio && !showMembershipRail && (
            <ProfileIdentityPass
              user={userBio}
              className="hidden lg:block group-has-[.membership-slot:not(:empty)]:hidden"
            />
          )}
        </div>
        <div className="min-w-0 px-4 py-6 sm:px-6 lg:col-start-1 lg:row-start-1 lg:p-0">
          {content}
        </div>
      </div>
    <CuratorFollowConfirmation />
    </div>
    </CuratorFollowContext.Provider>
  );
}

function ProfileTabStrip({ showBack, ...tabs }: { showBack: boolean } & ComponentProps<typeof ProfileTabs>) {
  return (
    <div className="sticky top-0 z-10 flex items-end bg-background/80 backdrop-blur-sm">
      {showBack && (
        <div className="hidden pb-2.5 pl-6 lg:block">
          <BackButton fallbackRoute="/explore" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <ProfileTabs {...tabs} />
      </div>
    </div>
  );
}
