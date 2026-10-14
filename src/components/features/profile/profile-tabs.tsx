'use client';

import { useEffect, useRef } from 'react';
import { Globe, Lock } from 'lucide-react';
import { TabUnderline } from '@/components/ui/tab-underline';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type TabType = 'music' | 'liked';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showLikedTab?: boolean;
  likedTabVisibility?: 'public' | 'private';
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  showLikedTab = true,
  likedTabVisibility,
}: ProfileTabsProps) {
  const tabs: { key: TabType; label: string }[] = [{ key: 'music', label: 'Music' }];
  if (showLikedTab) tabs.push({ key: 'liked', label: 'Liked' });

  const LikedVisibilityIcon = likedTabVisibility === 'private' ? Lock : Globe;
  const listRef = useRef<HTMLDivElement>(null);
  // The strip scrolls on narrow screens; a deep-linked tab must not start off-screen.
  useEffect(() => {
    listRef.current?.querySelector('[data-state="active"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [activeTab]);

  return (
    // Manual activation: each tab change rewrites the URL and fetches, so arrow keys
    // move focus and Enter or Space selects.
    <Tabs
      value={activeTab}
      onValueChange={(next) => onTabChange(next === 'liked' ? 'liked' : 'music')}
      activationMode="manual"
      className="gap-0 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pt-5"
    >
      <TabsList
        ref={listRef}
        aria-label="Profile content"
        className="tab-scroll-fade relative -mx-3 flex h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent px-3 py-0 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6"
      >
        <TabUnderline value={activeTab} />
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="h-10 flex-none gap-1.5 rounded-none border-0 px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
          >
            <span className="tab-label" data-label={tab.label}>{tab.label}</span>
            {tab.key === 'liked' && likedTabVisibility && (
              <LikedVisibilityIcon
                aria-label={likedTabVisibility === 'private' ? 'Private' : 'Public'}
                className="size-3 shrink-0 text-muted-foreground/70"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
