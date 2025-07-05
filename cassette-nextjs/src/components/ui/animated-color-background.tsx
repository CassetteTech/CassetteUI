'use client';

import React from 'react';

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
  return (
    <div
      className="absolute inset-0 -z-10 transition-all ease-in-out"
      style={{
        // Set the gradient background. Defaults to transparent if color is null.
        background: color ? `linear-gradient(180deg, 
          ${color} 0%, 
          ${color}CC 15%, 
          ${color}99 30%, 
          ${color}66 45%, 
          ${color}40 60%, 
          ${color}26 75%, 
          #D1D5DB4D 90%, 
          #D1D5DB 100%)` : 'transparent',
        // Control the opacity. When a color is provided, fade in (opacity: 1).
        // When no color, be completely invisible (opacity: 0).
        opacity: color ? 1 : 0,
        // The transition property applies to both background and opacity.
        transitionDuration: `${duration}ms`,
      }}
    />
  );
};