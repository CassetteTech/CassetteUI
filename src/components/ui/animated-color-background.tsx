'use client';

import React from 'react';
import { useTheme } from 'next-themes';

interface AnimatedColorBackgroundProps {
  /** The color to display. If null, the background will be transparent and invisible. */
  color: string | null;
  /** The duration of the transition in milliseconds. Defaults to 1500ms. */
  duration?: number;
}

export const AnimatedColorBackground: React.FC<AnimatedColorBackgroundProps> = ({
  color,
  duration = 3000,
}) => {
  const { theme } = useTheme();
  
  // Reduce gradient height in dark mode - make it fade out sooner
  const gradientStops = theme === 'dark' 
    ? `${color} 0%, 
       ${color}CC 10%, 
       ${color}99 20%, 
       ${color}66 30%, 
       ${color}40 40%, 
       ${color}26 50%, 
       ${color}00 65%`
    : `${color} 0%, 
       ${color}CC 15%, 
       ${color}99 30%, 
       ${color}66 45%, 
       ${color}40 60%, 
       ${color}26 75%, 
       ${color}00 90%`;
  
  return (
    <div
      className="absolute inset-0 -z-10 transition-all ease-in-out"
      style={{
        // Set the gradient background with theme-specific height.
        background: color ? `linear-gradient(0deg, ${gradientStops})` : 'transparent',
        // Control the opacity. When a color is provided, fade in (opacity: 1).
        // When no color, be completely invisible (opacity: 0).
        opacity: color ? 1 : 0,
        // The transition property applies to both background and opacity.
        transitionDuration: `${duration}ms`,
      }}
    />
  );
};