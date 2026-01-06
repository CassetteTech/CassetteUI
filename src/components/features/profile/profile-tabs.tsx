'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabType, HTMLButtonElement>>(new Map());
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  const updateSlider = useCallback(() => {
    const activeTabEl = tabRefs.current.get(activeTab);
    const container = containerRef.current;

    if (activeTabEl && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTabEl.getBoundingClientRect();

      setSliderStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [updateSlider]);

  const setTabRef = (key: TabType) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(key, el);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div
        ref={containerRef}
        className="relative flex h-12 items-center justify-start rounded-xl w-full lg:w-fit p-1 bg-muted/50 backdrop-blur-sm border border-border/50"
      >
        {/* Sliding indicator */}
        <div
          className="absolute top-1 bottom-1 rounded-lg shadow-sm transition-all duration-300 ease-out"
          style={{
            left: sliderStyle.left,
            width: sliderStyle.width,
            backgroundColor: theme.colors.brandRed,
          }}
        />

        {/* Tab buttons */}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            ref={setTabRef(tab.key)}
            onClick={() => onTabChange(tab.key)}
            className={`
              relative z-10 flex-1 lg:flex-none inline-flex items-center justify-center
              whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium
              transition-colors duration-200
              ${activeTab === tab.key
                ? 'text-white'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}