'use client';

import React from 'react';
import { useTheme } from 'next-themes';

interface AnimatedColorBackgroundProps {
  /** The primary color to display. If null, the background will be transparent and invisible. */
  color: string | null;
  /** Optional array of colors for richer multi-stop gradients [primary, secondary]. */
  gradientColors?: string[];
  /** The duration of the transition in milliseconds. Defaults to 3000ms. */
  duration?: number;
}

export const AnimatedColorBackground: React.FC<AnimatedColorBackgroundProps> = ({
  color,
  gradientColors,
  duration = 3000,
}) => {
  const { theme } = useTheme();

  // Build gradient based on whether we have multiple colors
  const buildGradient = (): string => {
    if (!color) return 'transparent';

    // If we have multiple gradient colors, create a richer two-tone gradient
    if (gradientColors && gradientColors.length >= 2) {
      const [primary, secondary] = gradientColors;

      // Two-tone gradient: primary at top fading through secondary to transparent
      const stops = theme === 'dark'
        ? `${primary} 0%,
           ${primary}CC 8%,
           ${secondary}99 20%,
           ${secondary}66 32%,
           ${secondary}40 44%,
           ${secondary}26 55%,
           ${secondary}00 68%`
        : `${primary} 0%,
           ${primary}CC 12%,
           ${secondary}99 28%,
           ${secondary}66 45%,
           ${secondary}40 62%,
           ${secondary}26 78%,
           ${secondary}00 92%`;

      return `linear-gradient(180deg, ${stops})`;
    }

    // Single color gradient (original behavior)
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

    return `linear-gradient(180deg, ${gradientStops})`;
  };

  return (
    <div
      className="absolute inset-0 -z-10 transition-all ease-in-out"
      style={{
        background: buildGradient(),
        opacity: color ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    />
  );
};
