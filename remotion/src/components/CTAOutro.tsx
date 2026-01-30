import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';

interface CTAOutroProps {
  startFrame?: number;
}

export const CTAOutro: React.FC<CTAOutroProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // Logo animation
  const logoScale = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.8 },
  });

  const logoOpacity = interpolate(logoScale, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  // Tagline animation
  const taglineDelay = 20;
  const taglineOpacity = interpolate(
    adjustedFrame - taglineDelay,
    [0, 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const taglineY = interpolate(
    adjustedFrame - taglineDelay,
    [0, 20],
    [30, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // URL animation
  const urlDelay = 45;
  const urlOpacity = interpolate(
    adjustedFrame - urlDelay,
    [0, 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Button animation
  const buttonDelay = 65;
  const buttonScale = spring({
    frame: adjustedFrame - buttonDelay,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const buttonOpacity = interpolate(buttonScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });

  // Button pulse effect
  const buttonPulse = adjustedFrame > buttonDelay + 30
    ? 1 + Math.sin((adjustedFrame - buttonDelay - 30) * 0.1) * 0.02
    : 1;

  // Platform icons
  const iconsDelay = 90;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
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
            width: 450,
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: 'center',
          maxWidth: 800,
        }}
      >
        <h2
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 48,
            fontWeight: theme.fontWeights.bold,
            color: theme.colors.textOnDark,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Share your playlists everywhere
        </h2>
        <p
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 26,
            color: theme.colors.gray400,
            margin: '16px 0 0 0',
          }}
        >
          One link. Every platform. All your favorites.
        </p>
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          marginTop: 10,
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.robotoFlex,
            fontSize: 32,
            fontWeight: theme.fontWeights.medium,
            color: theme.colors.brandCream,
            letterSpacing: 1,
          }}
        >
          cassette.tech
        </span>
      </div>

      {/* CTA Button */}
      <div
        style={{
          marginTop: 20,
          transform: `scale(${buttonScale * buttonPulse})`,
          opacity: buttonOpacity,
        }}
      >
        {/* Button with retro style */}
        <div
          style={{
            position: 'relative',
          }}
        >
          {/* Shadow layer */}
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: '100%',
              height: '100%',
              backgroundColor: theme.colors.brandRedD,
              borderRadius: 12,
            }}
          />

          {/* Main button */}
          <div
            style={{
              position: 'relative',
              backgroundColor: theme.colors.brandRed,
              borderRadius: 12,
              padding: '20px 50px',
              border: `3px solid ${theme.colors.brandBlack}`,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.teko,
                fontSize: 32,
                fontWeight: theme.fontWeights.bold,
                color: theme.colors.white,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Create Your Free Account
            </span>
          </div>
        </div>
      </div>

      {/* Platform icons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginTop: 40,
        }}
      >
        {['spotify', 'apple_music', 'deezer'].map((platform, i) => {
          const iconScale = spring({
            frame: adjustedFrame - iconsDelay - i * 8,
            fps,
            config: { damping: 200 },
          });

          return (
            <div
              key={platform}
              style={{
                transform: `scale(${iconScale})`,
                opacity: interpolate(iconScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: theme.colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.shadows.album,
                }}
              >
                <Img
                  src={staticFile(`images/${platform}_logo_colored.png`)}
                  style={{ width: 36, height: 36, objectFit: 'contain' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional platforms text */}
      <div
        style={{
          opacity: interpolate(
            adjustedFrame - iconsDelay - 30,
            [0, 15],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          ),
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 18,
            color: theme.colors.gray500,
          }}
        >
          + Tidal, YouTube Music, Amazon Music & more
        </span>
      </div>
    </div>
  );
};
