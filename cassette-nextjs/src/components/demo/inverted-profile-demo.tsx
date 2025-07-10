'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ProfileDemo } from '@/components/demo/profile-demo';

export function InvertedProfileDemo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8 lg:py-16">
        <div className="w-80 h-[640px] bg-black rounded-[2.5rem] p-2 shadow-2xl animate-pulse" />
      </div>
    );
  }

  // CSS variable overrides for inverted theme
  const invertedStyles = resolvedTheme === 'light' 
    ? {
        // Dark theme values when in light mode
        '--background': '210 10% 14%',
        '--foreground': '44 43% 92%',
        '--muted': '210 10% 19%',
        '--muted-foreground': '213 4% 61%',
        '--border': '213 7% 17%',
      } as React.CSSProperties
    : {
        // Light theme values when in dark mode
        '--background': '44 43% 92%',
        '--foreground': '210 10% 14%',
        '--muted': '43 27% 88%',
        '--muted-foreground': '210 10% 35%',
        '--border': '210 9% 89%',
      } as React.CSSProperties;

  // Calculate the actual color values for arrows
  // Dark demo (shown in light mode) should have dark arrows
  // Light demo (shown in dark mode) should have light arrows
  const arrowColor = resolvedTheme === 'light' 
    ? '#1F2327' // Dark arrows for dark demo (shown in light mode)
    : '#F8F0DE'; // Light arrows for light demo (shown in dark mode)

  return (
    <div style={invertedStyles} className="isolate">
      <ProfileDemo arrowColor={arrowColor} />
    </div>
  );
}