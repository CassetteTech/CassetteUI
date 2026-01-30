import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';
import { FadeIn } from './shared/FadeIn';

interface AnimatedLogoProps {
  showTagline?: boolean;
  tagline?: string;
  delay?: number;
  size?: 'small' | 'medium' | 'large';
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  showTagline = true,
  tagline = 'Express yourself through your favorite songs',
  delay = 0,
  size = 'large',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;

  // Logo scale animation
  const logoScale = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 200,
      stiffness: 80,
      mass: 0.8,
    },
  });

  // Logo opacity
  const logoOpacity = interpolate(
    adjustedFrame,
    [0, 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Tagline appears after logo
  const taglineDelay = 30; // frames
  const taglineOpacity = interpolate(
    adjustedFrame - taglineDelay,
    [0, 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const taglineY = interpolate(
    adjustedFrame - taglineDelay,
    [0, 20],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Size configurations
  const sizeConfig = {
    small: { logoWidth: 200, fontSize: 24 },
    medium: { logoWidth: 350, fontSize: 32 },
    large: { logoWidth: 500, fontSize: 42 },
  };

  const config = sizeConfig[size];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
      }}
    >
      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        <Img
          src={staticFile('images/cassette_words_logo.png')}
          style={{
            width: config.logoWidth,
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Tagline */}
      {showTagline && (
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          <p
            style={{
              fontFamily: theme.fonts.atkinson,
              fontSize: config.fontSize,
              fontWeight: theme.fontWeights.medium,
              color: theme.colors.textOnDark,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {tagline}
          </p>
        </div>
      )}
    </div>
  );
};
