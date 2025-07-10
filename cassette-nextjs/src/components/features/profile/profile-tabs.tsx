'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { theme } from "@/lib/theme";

export type TabType = 'playlists' | 'tracks' | 'artists' | 'albums';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs: { key: TabType; label: string }[] = [
    { key: 'playlists', label: 'Playlists' },
    { key: 'tracks', label: 'Songs' },
    { key: 'artists', label: 'Artists' },
    { key: 'albums', label: 'Albums' },
  ];

  return (
    <div className="p-4 lg:p-6">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)} className="w-full">
        <TabsList className="flex h-12 items-center justify-start rounded-xl w-full lg:w-fit p-1 bg-muted/50 backdrop-blur-sm border border-border/50">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="flex-1 lg:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground data-[state=active]:text-white"
              style={{
                backgroundColor: activeTab === tab.key ? theme.colors.brandRed : undefined,
              }}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}