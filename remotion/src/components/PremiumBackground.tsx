import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { theme } from '../theme';
import { springConfigs } from './shared/springs';

interface PremiumBackgroundProps {
  fadeIn?: boolean;
  fadeInDelay?: number;
  showAmbientGlow?: boolean;
}

/**
 * Premium Background Component
 *
 * Clean, professional background with:
 * - Layer 1: Deep gradient (#0D0F11 → #1F2327 → #0D0F11)
 * - Layer 2: Subtle red ambient glow at bottom (brandRed at 8% opacity, blurred)
 * - Layer 3: Optional subtle noise texture (2-3% opacity) - CSS-based
 *
 * No floating elements. Clean, cinematic.
 */
export const PremiumBackground: React.FC<PremiumBackgroundProps> = ({
  fadeIn = true,
  fadeInDelay = 0,
  showAmbientGlow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const fadeOpacity = fadeIn
    ? spring({
        frame: frame - fadeInDelay,
        fps,
        config: springConfigs.gentle,
      })
    : 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        opacity: fadeOpacity,
      }}
    >
      {/* Layer 1: Deep gradient background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(180deg,
            ${theme.colors.brandBlackD} 0%,
            ${theme.colors.brandBlack} 50%,
            ${theme.colors.brandBlackD} 100%)`,
        }}
      />

      {/* Layer 2: Subtle red ambient glow at bottom */}
      {showAmbientGlow && (
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '400px',
            background: `radial-gradient(ellipse at center bottom,
              ${theme.colors.brandRed}14 0%,
              transparent 70%)`,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Layer 3: Subtle noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
