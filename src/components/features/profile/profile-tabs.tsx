'use client';

/** Profile content tabs in the Curator Studio underline style: Radix tabs, lucide icons, sentence case. */

import { Disc3, FileText, Globe, Heart, ListMusic, Lock, Music, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type TabType = 'posts' | 'playlists' | 'tracks' | 'artists' | 'albums' | 'liked';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showPostsTab?: boolean;
  showLikedTab?: boolean;
  likedTabVisibility?: 'public' | 'private';
}

const TAB_ICONS = {
  posts: FileText,
  playlists: ListMusic,
  tracks: Music,
  artists: User,
  albums: Disc3,
  liked: Heart,
} satisfies Record<TabType, LucideIcon>;

export function ProfileTabs({
  activeTab,
  onTabChange,
  showPostsTab = false,
  showLikedTab = true,
  likedTabVisibility = 'public',
}: ProfileTabsProps) {
  const tabs: { key: TabType; label: string }[] = [];
  if (showPostsTab) tabs.push({ key: 'posts', label: 'Posts' });
  tabs.push(
    { key: 'playlists', label: 'Playlists' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'artists', label: 'Artists' },
    { key: 'albums', label: 'Albums' },
  );
  if (showLikedTab) tabs.push({ key: 'liked', label: 'Liked' });

  const LikedVisibilityIcon = likedTabVisibility === 'private' ? Lock : Globe;

  return (
    // SAFETY: every trigger value below is a TabType, so Radix only ever reports one.
    <Tabs value={activeTab} onValueChange={(next) => onTabChange(next as TabType)} className="gap-0 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pt-5">
      <TabsList
        aria-label="Profile content"
        className="tab-scroll-fade -mx-3 flex h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent px-3 py-0 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6"
      >
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.key];
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="-mb-px h-10 flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {tab.label}
              {tab.key === 'liked' && (
                <LikedVisibilityIcon
                  aria-label={likedTabVisibility === 'private' ? 'Private' : 'Public'}
                  className="size-3 shrink-0 text-muted-foreground/70"
                />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
