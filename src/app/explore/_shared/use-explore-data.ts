'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useExploreActivity, useExploreUsers } from '@/hooks/use-profile';
import { profileService } from '@/services/profile';
import { applyCachedArtwork } from '@/services/profile-artwork-cache';
import { useDebounce } from '@/hooks/use-debounce';
import { ActivityPost, ExploreUser } from '@/types';

export const PAGE_SIZE = 20;
export const SECTION_INCREMENT = 8;

export type MusicElementType = 'track' | 'album' | 'artist' | 'playlist';

export const MUSIC_SECTION_ORDER: MusicElementType[] = ['playlist', 'track', 'album', 'artist'];

export const MUSIC_SECTION_LABELS: Record<MusicElementType, string> = {
  track: 'Tracks',
  album: 'Albums',
  artist: 'Artists',
  playlist: 'Playlists',
};

export const MUSIC_SECTION_EMPTY_COPY: Record<MusicElementType, string> = {
  track: 'No public track conversions yet.',
  album: 'No public album conversions yet.',
  artist: 'No public artist conversions yet.',
  playlist: 'No public playlist conversions yet.',
};

export function useExploreData() {
  const [additionalPosts, setAdditionalPosts] = useState<ActivityPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetchingMorePosts, setIsFetchingMorePosts] = useState(false);
  const [isLoadingMoreBySection, setIsLoadingMoreBySection] = useState<Record<MusicElementType, boolean>>({
    track: false, album: false, artist: false, playlist: false,
  });
  const [sectionHasMorePotential, setSectionHasMorePotential] = useState<Record<MusicElementType, boolean>>({
    track: true, album: true, artist: true, playlist: true,
  });
  const [visiblePostsBySection, setVisiblePostsBySection] = useState<Record<MusicElementType, number>>({
    track: SECTION_INCREMENT, album: SECTION_INCREMENT, artist: SECTION_INCREMENT, playlist: SECTION_INCREMENT,
  });

  const [additionalUsers, setAdditionalUsers] = useState<ExploreUser[]>([]);
  const [currentUsersPage, setCurrentUsersPage] = useState(1);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
  const [visibleUsersCount, setVisibleUsersCount] = useState(SECTION_INCREMENT);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const isSearchingUsers = debouncedUserSearch.trim().length > 0;

  const { data: exploreData, isLoading: isLoadingPosts, error: postsError } = useExploreActivity({ page: 1, pageSize: PAGE_SIZE });
  const {
    data: exploreUsersData,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useExploreUsers({ page: 1, pageSize: PAGE_SIZE, q: debouncedUserSearch });

  useEffect(() => {
    setAdditionalUsers([]);
    setCurrentUsersPage(1);
    setVisibleUsersCount(isSearchingUsers ? PAGE_SIZE : SECTION_INCREMENT);
  }, [isSearchingUsers]);

  const allPosts = useMemo(() => {
    const initialPosts = exploreData?.items ?? [];
    return applyCachedArtwork([...initialPosts, ...additionalPosts]);
  }, [exploreData?.items, additionalPosts]);

  const users = useMemo(() => {
    const initialUsers = exploreUsersData?.users ?? [];
    return [...initialUsers, ...additionalUsers];
  }, [exploreUsersData?.users, additionalUsers]);
  const visibleUsers = useMemo(
    () => (isSearchingUsers ? users : users.slice(0, visibleUsersCount)),
    [isSearchingUsers, users, visibleUsersCount]
  );

  const groupedPosts = useMemo(() => {
    const groups: Record<MusicElementType, ActivityPost[]> = { track: [], album: [], artist: [], playlist: [] };
    for (const post of allPosts) {
      const key = post.elementType.toLowerCase() as MusicElementType;
      if (key in groups) groups[key].push(post);
    }
    return groups;
  }, [allPosts]);

  const postTotalItems = exploreData?.totalItems ?? 0;
  const hasMorePosts = allPosts.length < postTotalItems;
  const usersTotalItems = exploreUsersData?.totalItems ?? 0;
  const hasMoreUsers = users.length < usersTotalItems;

  const loadMorePostsForSection = useCallback(async (section: MusicElementType) => {
    if (isFetchingMorePosts || isLoadingMoreBySection[section]) return;
    const currentVisible = visiblePostsBySection[section];
    const targetVisible = currentVisible + SECTION_INCREMENT;
    const currentSectionCount = groupedPosts[section].length;
    if (currentSectionCount >= targetVisible) {
      setVisiblePostsBySection((prev) => ({ ...prev, [section]: targetVisible }));
      return;
    }
    if (!hasMorePosts) {
      setVisiblePostsBySection((prev) => ({ ...prev, [section]: currentSectionCount }));
      return;
    }
    const fetchedItems: ActivityPost[] = [];
    let nextPage = currentPage;
    let combinedPosts = [...allPosts];
    let sectionCount = currentSectionCount;
    try {
      setIsFetchingMorePosts(true);
      setIsLoadingMoreBySection((prev) => ({ ...prev, [section]: true }));
      while (sectionCount < targetVisible && combinedPosts.length < postTotalItems) {
        nextPage += 1;
        const nextPageData = await profileService.fetchExploreActivity({ page: nextPage, pageSize: PAGE_SIZE });
        fetchedItems.push(...nextPageData.items);
        combinedPosts = applyCachedArtwork([...combinedPosts, ...nextPageData.items]);
        sectionCount = combinedPosts.filter((post) => post.elementType.toLowerCase() === section).length;
      }
      if (fetchedItems.length > 0) {
        setAdditionalPosts((prev) => [...prev, ...fetchedItems]);
        setCurrentPage(nextPage);
      }
      setVisiblePostsBySection((prev) => ({ ...prev, [section]: Math.min(targetVisible, sectionCount) }));
      if (sectionCount <= currentVisible) {
        setSectionHasMorePotential((prev) => ({ ...prev, [section]: false }));
      }
    } catch (e) {
      console.error(`Error loading more explore posts for ${section}:`, e);
    } finally {
      setIsLoadingMoreBySection((prev) => ({ ...prev, [section]: false }));
      setIsFetchingMorePosts(false);
    }
  }, [allPosts, currentPage, groupedPosts, hasMorePosts, isFetchingMorePosts, isLoadingMoreBySection, postTotalItems, visiblePostsBySection]);

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingMoreUsers) return;
    if (isSearchingUsers) {
      if (!hasMoreUsers) return;

      try {
        setIsLoadingMoreUsers(true);
        let nextPage = currentUsersPage;
        const fetchedUsers: ExploreUser[] = [];

        while (fetchedUsers.length === 0 && users.length + fetchedUsers.length < usersTotalItems) {
          nextPage += 1;
          const nextPageData = await profileService.fetchExploreUsers({
            page: nextPage,
            pageSize: PAGE_SIZE,
            q: debouncedUserSearch,
          });
          fetchedUsers.push(...nextPageData.users);
        }

        if (fetchedUsers.length > 0) {
          setAdditionalUsers((prev) => [...prev, ...fetchedUsers]);
          setCurrentUsersPage(nextPage);
        }
      } catch (e) {
        console.error('Error loading more explore users:', e);
      } finally {
        setIsLoadingMoreUsers(false);
      }
      return;
    }

    const targetVisible = visibleUsersCount + SECTION_INCREMENT;
    if (users.length >= targetVisible) {
      setVisibleUsersCount(targetVisible);
      return;
    }
    if (!hasMoreUsers) {
      setVisibleUsersCount(Math.min(targetVisible, users.length));
      return;
    }
    try {
      setIsLoadingMoreUsers(true);
      let nextPage = currentUsersPage;
      const fetchedUsers: ExploreUser[] = [];
      let combinedUsers = [...users];
      while (combinedUsers.length < targetVisible && combinedUsers.length < usersTotalItems) {
        nextPage += 1;
        const nextPageData = await profileService.fetchExploreUsers({ page: nextPage, pageSize: PAGE_SIZE, q: debouncedUserSearch });
        fetchedUsers.push(...nextPageData.users);
        combinedUsers = [...combinedUsers, ...nextPageData.users];
      }
      if (fetchedUsers.length > 0) {
        setAdditionalUsers((prev) => [...prev, ...fetchedUsers]);
        setCurrentUsersPage(nextPage);
      }
      setVisibleUsersCount(Math.min(targetVisible, combinedUsers.length));
    } catch (e) {
      console.error('Error loading more explore users:', e);
    } finally {
      setIsLoadingMoreUsers(false);
    }
  }, [currentUsersPage, debouncedUserSearch, hasMoreUsers, isLoadingMoreUsers, isSearchingUsers, users, usersTotalItems, visibleUsersCount]);

  return {
    allPosts,
    groupedPosts,
    visiblePostsBySection,
    sectionHasMorePotential,
    isLoadingPosts,
    postsError,
    hasMorePosts,
    isLoadingMoreBySection,
    loadMorePostsForSection,
    users: visibleUsers,
    totalUsers: users.length,
    visibleUsersCount,
    isLoadingUsers,
    usersError,
    refetchUsers,
    hasMoreUsers,
    isLoadingMoreUsers,
    loadMoreUsers,
    userSearch,
    setUserSearch,
    isSearchingUsers,
  };
}
