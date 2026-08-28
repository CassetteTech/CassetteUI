'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe, Lock } from 'lucide-react';
import { useTabs } from '@/components/ui/interior/tabs';

export type TabType = 'playlists' | 'tracks' | 'artists' | 'albums' | 'liked';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showLikedTab?: boolean;
  likedTabVisibility?: 'public' | 'private';
}

const INDICATOR = { type: 'spring', stiffness: 620, damping: 42, mass: 0.35 } as const;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function ProfileTabs({
  activeTab,
  onTabChange,
  showLikedTab = true,
  likedTabVisibility = 'public',
}: ProfileTabsProps) {
  const tabs: { key: TabType; label: string }[] = [
    { key: 'playlists', label: 'Playlists' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'artists', label: 'Artists' },
    { key: 'albums', label: 'Albums' },
    ...(showLikedTab ? [{ key: 'liked' as TabType, label: 'Liked' }] : []),
  ];

  const { tabListProps, getTabProps } = useTabs({
    items: tabs.map((tab) => ({ value: tab.key, label: tab.label })),
    value: activeTab,
    onValueChange: (next) => onTabChange(next as TabType),
  });

  const rowRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [slider, setSlider] = useState({ x: 0, width: 0, ready: false });
  const reduced = useReducedMotion();

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

  useIsoLayoutEffect(() => {
    const node = tabRefs.current[activeIndex];
    const row = rowRef.current;
    if (!node || !row) return;

    const read = () => {
      setSlider((prev) =>
        prev.x === node.offsetLeft && prev.width === node.offsetWidth && prev.ready
          ? prev
          : { x: node.offsetLeft, width: node.offsetWidth, ready: true },
      );
    };

    read();
    const observer = new ResizeObserver(read);
    observer.observe(row);
    return () => observer.disconnect();
  }, [activeIndex, showLikedTab]);

  return (
    <div className="bg-background/95 backdrop-blur-sm px-3 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pt-5">
      <div
        {...tabListProps}
        aria-label="Profile content"
        ref={rowRef}
        className="relative flex items-center justify-start w-full lg:w-fit border-b-2 border-border/70"
      >
        {/* Sliding underline indicator */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: slider.x, width: slider.width }}
          transition={reduced ? { duration: 0 } : INDICATOR}
          style={{ opacity: slider.ready ? 1 : 0 }}
          className="absolute -bottom-0.5 left-0 h-0.5 bg-primary"
        />

        {/* Tab buttons */}
        {tabs.map((tab, index) => {
          const tabProps = getTabProps({ value: tab.key, label: tab.label }, index);
          return (
            <button
              key={tab.key}
              {...tabProps}
              ref={(node) => {
                tabProps.ref(node);
                tabRefs.current[index] = node;
              }}
              className={`
                relative z-10 flex-1 min-w-0 lg:flex-none lg:min-w-fit
                inline-flex items-center justify-center whitespace-nowrap
                px-1.5 sm:px-3 lg:px-4 py-2.5
                font-mono text-[11px] sm:text-xs uppercase tracking-[0.15em]
                transition-colors duration-200
                ${activeTab === tab.key
                  ? 'font-bold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <span className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
                <span className="truncate">{tab.label}</span>
                {tab.key === 'liked' && (
                  likedTabVisibility === 'private'
                    ? <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                    : <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
