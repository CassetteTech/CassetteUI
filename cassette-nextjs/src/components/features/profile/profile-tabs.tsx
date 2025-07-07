'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabType = 'playlists' | 'tracks' | 'artists' | 'albums';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  variant?: 'dark' | 'light';
}

export function ProfileTabs({ activeTab, onTabChange, variant = 'dark' }: ProfileTabsProps) {
  const tabs: { key: TabType; label: string }[] = [
    { key: 'playlists', label: 'Playlists' },
    { key: 'tracks', label: 'Songs' },
    { key: 'artists', label: 'Artists' },
    { key: 'albums', label: 'Albums' },
  ];

  const isDark = variant === 'dark';

  return (
    <div className="p-4 lg:p-6">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)} className="w-full">
        <TabsList className={`flex h-12 items-center justify-start rounded-xl w-full lg:w-fit p-1 ${
          isDark 
            ? 'bg-white/10 backdrop-blur-sm' 
            : 'bg-white/60 backdrop-blur-sm border border-gray-200/50'
        }`}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={`flex-1 lg:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:shadow-sm ${
                isDark
                  ? 'text-gray-300 hover:text-white data-[state=active]:bg-[#ED2748] data-[state=active]:text-white'
                  : 'text-gray-600 hover:text-gray-800 data-[state=active]:bg-[#ED2748] data-[state=active]:text-white'
              }`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}